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

async function syncAvatarItem(strapi, result) {
  const config = getSyncConfig();
  if (!config || !result?.documentId) return;

  const item = await strapi.documents('api::avatar-item.avatar-item').findOne({
    documentId: result.documentId,
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
  }
}

module.exports = {
  async afterCreate(event) {
    await syncAvatarItem(strapi, event.result);
  },

  async afterUpdate(event) {
    await syncAvatarItem(strapi, event.result);
  },
};
