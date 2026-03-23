import {
  default as renderOpenGraphImage,
} from "../opengraph-image";

export async function GET() {
  return renderOpenGraphImage();
}
