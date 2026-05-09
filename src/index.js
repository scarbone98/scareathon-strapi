'use strict';

const avatarItemUid = 'api::avatar-item.avatar-item';
const avatarItemConfigKey = `configuration_content_types::${avatarItemUid}`;

function withoutFields(layout, fieldNames) {
  return layout
    .map((row) => row.filter((field) => !fieldNames.has(field.name)))
    .filter((row) => row.length > 0);
}

function findRowIndex(layout, fieldName) {
  const index = layout.findIndex((row) => row.some((field) => field.name === fieldName));
  return index === -1 ? null : index;
}

async function placeAvatarEquipGroupBesideSlot(strapi) {
  const store = strapi.store({
    type: 'plugin',
    name: 'content_manager',
  });
  const config = await store.get({ key: avatarItemConfigKey });
  const editLayout = config?.layouts?.edit;

  if (!Array.isArray(editLayout)) return;

  const existingSlotRowIndex = findRowIndex(editLayout, 'slot');
  const cleanedLayout = withoutFields(editLayout, new Set(['slot', 'equipGroup']));
  const insertIndex =
    existingSlotRowIndex === null
      ? Math.min(cleanedLayout.length, 1)
      : Math.min(existingSlotRowIndex, cleanedLayout.length);

  const nextLayout = [
    ...cleanedLayout.slice(0, insertIndex),
    [
      { name: 'slot', size: 6 },
      { name: 'equipGroup', size: 6 },
    ],
    ...cleanedLayout.slice(insertIndex),
  ];

  await store.set({
    key: avatarItemConfigKey,
    value: {
      ...config,
      layouts: {
        ...(config.layouts || {}),
        edit: nextLayout,
      },
    },
  });
}

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    await placeAvatarEquipGroupBesideSlot(strapi);
  },
};
