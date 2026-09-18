export const jobsConfig = {
  queues: {
    mail: "mail.send",
    orphan: "files.cleanup-orphans",
    import: "files.import-markdown",
    export: "files.export-markdown",
    challenges: "auth.cleanup-challenges",
    sessions: "sessions.cleanup-expired",
    audit: "system.cleanup-audit",
    inactiveUsers: "users.update-inactive",
    custom: "system.custom-task"
  }
};
