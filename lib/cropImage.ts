export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
        image.src = url;
    });

export function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = getRadianAngle(rotation);
    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * This function handles cropping and resizing the image to a standard 512x512 square,
 * formatted as WebP if possible, otherwise JPEG, keeping it around 200-400KB.
 */
export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0,
    flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        return null;
    }

    const rotRad = getRadianAngle(rotation);

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // draw rotated image
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement("canvas");
    const croppedCtx = croppedCanvas.getContext("2d");

    if (!croppedCtx) {
        return null;
    }

    // Set standard avatar size to 512x512
    const OUTPUT_SIZE = 512;
    croppedCanvas.width = OUTPUT_SIZE;
    croppedCanvas.height = OUTPUT_SIZE;

    // Draw the cropped image onto the standard-sized canvas
    croppedCtx.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
    );

    // Return as a blob, try WebP first as it is generally smallest and supports high quality
    return new Promise((resolve, reject) => {
        croppedCanvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    // Fallback to jpeg if webp totally fails (rare)
                    croppedCanvas.toBlob(
                        (fallbackBlob) => {
                            if (fallbackBlob) {
                                resolve(fallbackBlob);
                            } else {
                                reject(new Error("Canvas toBlob failed - could not generate image blob."));
                            }
                        },
                        "image/jpeg",
                        0.9
                    );
                }
            },
            "image/webp",
            0.9
        );
    });
}

