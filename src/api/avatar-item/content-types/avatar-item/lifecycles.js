'use strict';

const SYNC_PATH = '/admin/strapi/avatar-items/sync';

function getSyncConfig() {
  const apiUrl = process.env.SCAREATHON_API_URL || process.env.SCAREATHON_BACKEND_URL;
  const secret = process.env.SCAREATHON_STRAPI_SYNC_SECRET;

  if (!apiUrl || !secret) return null;

  return {
    url: `${apiUrl.replace(/\/$/, '')}${SYNC_PATH}`,
    secret,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scheduleAvatarItemSync(strapi, result) {
  if (!result?.documentId) return;

  setTimeout(() => {
    syncAvatarItem(strapi, result).catch((error) => {
      strapi.log.error(
        `Failed to schedule avatar item sync ${result.documentId}: ${error.message}`
      );
    });
  }, 3000);
}

function scheduleAvatarItemDelete(strapi, result) {
  if (!result?.documentId) return;

  setTimeout(() => {
    deleteAvatarItem(strapi, result).catch((error) => {
      strapi.log.error(
        `Failed to schedule avatar item delete ${result.documentId}: ${error.message}`
      );
    });
  }, 1000);
}

async function syncAvatarItem(strapi, result) {
  const config = getSyncConfig();
  if (!config || !result?.documentId) return;

  // Strapi v5 publishes by promoting a document version. This runs from a
  // timer after the lifecycle returns, so the public API sees the new version.
  await wait(250);

  const item = await strapi.documents('api::avatar-item.avatar-item').findOne({
    documentId: result.documentId,
    status: 'published',
    populate: {
      asset: true,
    },
  });

  if (!item?.publishedAt) return;

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Strapi-Sync-Secret': config.secret,
    },
    body: JSON.stringify({
      documentId: item.documentId,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    strapi.log.error(
      `Failed to sync avatar item ${item.documentId}: ${response.status} ${body}`
    );
    return;
  }

  strapi.log.info(`Synced avatar item ${item.documentId}`);
}

async function deleteAvatarItem(strapi, result) {
  const config = getSyncConfig();
  if (!config || !result?.documentId) return;

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Strapi-Sync-Secret': config.secret,
    },
    body: JSON.stringify({
      action: 'delete',
      documentId: result.documentId,
      itemKey: result.itemKey,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    strapi.log.error(
      `Failed to delete avatar item ${result.documentId}: ${response.status} ${body}`
    );
    return;
  }

  strapi.log.info(`Deleted avatar item ${result.documentId} from Scareathon`);
}

module.exports = {
  async afterCreate(event) {
    scheduleAvatarItemSync(strapi, event.result);
  },

  async afterUpdate(event) {
    scheduleAvatarItemSync(strapi, event.result);
  },

  async afterDelete(event) {
    scheduleAvatarItemDelete(strapi, event.result);
  },
};
