import { PrismaClient, ResourceFileKind } from "@prisma/client";
import { getPublicResourceFileState } from "../src/lib/resource-file-state";

const prisma = new PrismaClient();

async function main() {
  const resources = await prisma.resource.findMany({
    select: {
      id: true,
      thumbnailUrl: true,
      files: {
        select: {
          kind: true,
          fileUrl: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  for (const resource of resources) {
    const previewUrls = resource.files
      .filter((file) => file.kind === ResourceFileKind.PREVIEW)
      .map((file) => file.fileUrl);
    const mainDownloadUrl =
      resource.files.find((file) => file.kind === ResourceFileKind.MAIN_DOWNLOAD)?.fileUrl ??
      null;
    const fileState = getPublicResourceFileState({
      thumbnailUrl: resource.thumbnailUrl,
      previewUrls,
      mainDownloadUrl,
    });

    await prisma.resource.update({
      where: { id: resource.id },
      data: fileState,
    });
  }

  console.log(`Backfilled public resource state for ${resources.length} resources.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
