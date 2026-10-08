const { expo } = require("./app.json");
module.exports = () => {
  const projectId = process.env.EAS_PROJECT_ID;
  if (
    projectId &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      projectId,
    )
  ) {
    throw new Error(
      "EAS_PROJECT_ID doit être l’identifiant UUID du projet Expo YAVIYA.",
    );
  }
  return {
    ...expo,
    ...(process.env.EAS_OWNER ? { owner: process.env.EAS_OWNER } : {}),
    extra: { ...expo.extra, ...(projectId ? { eas: { projectId } } : {}) },
  };
};
