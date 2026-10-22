import { defineRailway, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "web";
export default defineRailway(() => {
  const web = service("web", {
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    start: "/usr/local/bin/nexatech-start web",
    healthcheck: "/up",
    healthcheckTimeout: 300,
    preDeploy: "php artisan migrate --force",
    replicas: { "iad": 1 },
  });

  const worker = service("worker", {
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    start: "/usr/local/bin/nexatech-start worker",
    replicas: { "iad": 1 },
  });

  const scheduler = service("scheduler", {
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    start: "/usr/local/bin/nexatech-start scheduler",
    deploy: { cronSchedule: "*/5 * * * *", restartPolicyType: "NEVER" },
    replicas: { "iad": 1 },
  });

  return project("NEXATECH Student Monitor", {
    variables: { managed: false },
    resources: [web, worker, scheduler],
  });
});
