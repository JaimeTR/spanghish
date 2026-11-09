import { describe, expect, it } from "vitest";
import { checkUpload } from "./uploads";
const ownerId = "b0000000-0000-4000-8000-000000000101";
describe("checkUpload", () => {
  it("checkUpload rejects application/zip with 'type'", () => expect(checkUpload({ ownerId, target: "resourceFile", fileName: "x.zip", mime: "application/zip", size: 10 })).toMatchObject({ ok: false, error: "type" }));
  it("rejects 26 MB with 'size'", () => expect(checkUpload({ ownerId, target: "resourceFile", fileName: "x.pdf", mime: "application/pdf", size: 26_214_401 })).toMatchObject({ ok: false, error: "size" }));
  it("accepts a 2 MB webp thumbnail and builds thumbnails/<uuid>.webp", () => {
    const result = checkUpload({ ownerId, target: "thumbnail", fileName: "x.webp", mime: "image/webp", size: 2_000_000 });
    expect(result).toMatchObject({ ok: true, bucket: "content-media" });
    if (result.ok) expect(result.path).toMatch(/^thumbnails\/[0-9a-f-]+\.webp$/);
  });
  it("builds resources/<resourceId>/<uuid>.pdf for a resource file", () => {
    const result = checkUpload({ ownerId, target: "resourceFile", fileName: "sheet.pdf", mime: "application/pdf", size: 200 });
    expect(result).toMatchObject({ ok: true, bucket: "resource-files" });
    if (result.ok) expect(result.path).toMatch(new RegExp(`^resources/${ownerId}/[0-9a-f-]+\\.pdf$`));
  });
  it("lessonImage over 2 MB is rejected", () => expect(checkUpload({ ownerId, target: "lessonImage", fileName: "x.png", mime: "image/png", size: 2_097_153 })).toMatchObject({ ok: false, error: "size" }));
  it("builds a unique teacher photo path in content-media", () => {
    const result = checkUpload({ ownerId, target:"teacherPhoto", fileName:"portrait.png", mime:"image/png", size:200 });
    expect(result).toMatchObject({ok:true,bucket:"content-media"});
    expect(result.ok && result.path).toMatch(/^teachers\/[0-9a-f-]{36}\.png$/);
  });
  it("teacher photos accept only PNG, JPEG, or WebP up to 2 MB", () => {
    expect(checkUpload({ ownerId,target:"teacherPhoto",fileName:"x.gif",mime:"image/gif",size:20 })).toMatchObject({ok:false,error:"type"});
    expect(checkUpload({ ownerId,target:"teacherPhoto",fileName:"x.png",mime:"image/png",size:2_097_153 })).toMatchObject({ok:false,error:"size"});
  });
});
