import "dotenv/config";

async function main() {
  const { provisionPublicDemo } = await import(
    "../src/core/demo/provision-demo"
  );
  const result = await provisionPublicDemo();
  console.log("Public demo provisioned", result);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Demo provisioning failed");
  process.exitCode = 1;
});
