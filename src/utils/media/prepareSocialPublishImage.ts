const SOCIAL_PUBLISH_IMAGE_WIDTH = 1080;
const SOCIAL_PUBLISH_IMAGE_HEIGHT = 1350;
const SOCIAL_PUBLISH_IMAGE_RATIO =
  SOCIAL_PUBLISH_IMAGE_WIDTH / SOCIAL_PUBLISH_IMAGE_HEIGHT;
const SOCIAL_PUBLISH_IMAGE_OUTPUT_MIME_TYPE = "image/jpeg";
const SOCIAL_PUBLISH_IMAGE_OUTPUT_QUALITY = 0.92;

type PreparedSocialPublishImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

function replaceFileExtension(fileName: string, nextExtension: string) {
  const normalizedExtension = nextExtension.replace(/^\./, "");
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex <= 0) {
    return `${fileName}.${normalizedExtension}`;
  }

  return `${fileName.slice(0, lastDotIndex)}.${normalizedExtension}`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.onload = () => {
      cleanup();
      resolve(image);
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("Image could not be loaded for social publishing."));
    };

    image.src = objectUrl;
  });
}

export async function prepareSocialPublishImage(
  file: File,
): Promise<PreparedSocialPublishImage> {
  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Image dimensions could not be read.");
  }

  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let cropX = 0;
  let cropY = 0;

  const sourceRatio = sourceWidth / sourceHeight;
  if (sourceRatio > SOCIAL_PUBLISH_IMAGE_RATIO) {
    cropWidth = sourceHeight * SOCIAL_PUBLISH_IMAGE_RATIO;
    cropX = (sourceWidth - cropWidth) / 2;
  } else if (sourceRatio < SOCIAL_PUBLISH_IMAGE_RATIO) {
    cropHeight = sourceWidth / SOCIAL_PUBLISH_IMAGE_RATIO;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SOCIAL_PUBLISH_IMAGE_WIDTH;
  canvas.height = SOCIAL_PUBLISH_IMAGE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image canvas is unavailable.");
  }

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
          return;
        }

        reject(new Error("Image could not be normalized for social publishing."));
      },
      SOCIAL_PUBLISH_IMAGE_OUTPUT_MIME_TYPE,
      SOCIAL_PUBLISH_IMAGE_OUTPUT_QUALITY,
    );
  });

  const normalizedFile = new File(
    [blob],
    replaceFileExtension(file.name, "jpg"),
    {
      type: SOCIAL_PUBLISH_IMAGE_OUTPUT_MIME_TYPE,
      lastModified: Date.now(),
    },
  );

  return {
    file: normalizedFile,
    previewUrl: URL.createObjectURL(blob),
    width: SOCIAL_PUBLISH_IMAGE_WIDTH,
    height: SOCIAL_PUBLISH_IMAGE_HEIGHT,
  };
}

