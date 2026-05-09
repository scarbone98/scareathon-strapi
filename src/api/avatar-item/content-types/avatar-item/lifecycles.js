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
  const documentId = result?.documentId;
  if (!documentId) return;

  setTimeout(() => {
    syncAvatarItem(strapi, documentId).catch((error) => {
      strapi.log.error(
        `Failed to schedule avatar item sync ${documentId}: ${error.message}`
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

async function syncAvatarItem(strapi, documentId) {
  const config = getSyncConfig();
  if (!config || !documentId) return;

  // Strapi v5 publishes by promoting a document version. Scareathon fetches the
  // document after this timer, so avoid querying Strapi from a stale lifecycle
  // transaction here.
  await wait(250);

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Strapi-Sync-Secret': config.secret,
    },
    body: JSON.stringify({
      documentId,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    strapi.log.error(
      `Failed to sync avatar item ${documentId}: ${response.status} ${body}`
    );
    return;
  }

  strapi.log.info(`Synced avatar item ${documentId}`);
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
