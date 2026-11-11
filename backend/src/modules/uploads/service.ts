import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../../config";
import { assert } from "../../http";
export interface StorageProvider {
  save(data: Buffer, extension: string, ownerId?: string): Promise<string>;
}
export const storage: StorageProvider = {
  async save(data, extension, ownerId) {
    await mkdir(config.uploadDir, { recursive: true });
    const name = randomUUID() + extension;
    await writeFile(path.join(config.uploadDir, name), data, { flag: "wx" });
    if (ownerId)
      await writeFile(
        path.join(config.uploadDir, "." + name + ".json"),
        JSON.stringify({ ownerId }),
        { flag: "wx" },
      );
    return "/uploads/" + name;
  },
};
export async function saveUpload(
  file: Express.Multer.File | undefined,
  ownerId: string,
  purpose: unknown,
) {
  assert(file, 400, "请选择图片");
  const types: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const ext = types[file.mimetype];
  const originalExt = path.extname(file.originalname).toLowerCase();
  assert(
    ext && (originalExt === ext || (ext === ".jpg" && originalExt === ".jpeg")),
    400,
    "仅支持 jpg、png、webp 图片",
  );
  const b = file.buffer;
  const valid =
    ext === ".jpg"
      ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : ext === ".png"
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : b.toString("ascii", 0, 4) === "RIFF" &&
          b.toString("ascii", 8, 12) === "WEBP";
  assert(valid, 400, "图片内容与文件类型不一致");
  return {
    url: await storage.save(
      b,
      ext,
      purpose === "certificate" ? ownerId : undefined,
    ),
  };
}

export async function privateOwner(filename: string): Promise<string | null> {
  assert(/^[a-zA-Z0-9_.-]+\.(jpg|png|webp)$/.test(filename), 404, "图片不存在");
  try {
    const value = JSON.parse(
      await readFile(
        path.join(config.uploadDir, "." + filename + ".json"),
        "utf8",
      ),
    ) as { ownerId: string };
    return value.ownerId;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
