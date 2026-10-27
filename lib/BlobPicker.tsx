"use client";
// The editor UI for the Blob fields in lib/blob-field.tsx: uploads one file
// straight to Vercel Blob through /api/blob and hands back its URL (and, for
// images, its pixel size).
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "@keystar/ui/button";
import { FieldPrimitive } from "@keystar/ui/field";
import { Text } from "@keystar/ui/typography";

export type BlobImage = { src: string; width: number; height: number };

async function send(file: File, folder: string) {
  const { url } = await upload(`${folder}/${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/blob",
    multipart: file.size > 20 * 1024 * 1024,
  });
  return url;
}

function size(url: string) {
  return new Promise<[number, number]>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
    img.onerror = () => reject(new Error("Couldn't read the image"));
    img.src = url;
  });
}

const filename = (url: string) => decodeURIComponent(url.split("/").pop() ?? url);

type Common = {
  label: string;
  description?: string;
  folder: string;
  isRequired?: boolean;
  /** show the "required" error (Keystatic's forceValidation) */
  invalid: boolean;
};

type Props =
  | (Common & { kind: "image"; value: BlobImage | null; onChange(v: BlobImage | null): void })
  | (Common & { kind: "file"; accept: string; value: string | null; onChange(v: string | null): void });

export function BlobPicker(props: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = props.kind === "image" ? (props.value?.src ?? null) : props.value;

  async function pick(file: File) {
    const src = await send(file, props.folder);
    if (props.kind === "image") {
      const [width, height] = await size(src);
      props.onChange({ src, width, height });
    } else {
      props.onChange(src);
    }
  }

  return (
    <FieldPrimitive
      label={props.label}
      description={props.description}
      isRequired={props.isRequired}
      errorMessage={error ?? (props.invalid && !url ? `${props.label} is required` : undefined)}
      labelElementType="span"
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {url && props.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ height: 64, width: "auto", borderRadius: 4 }} />
        )}
        {url && (
          <Text>
            <a href={url} target="_blank" rel="noreferrer">
              {filename(url)}
            </a>
          </Text>
        )}
        <input
          ref={input}
          type="file"
          accept={props.kind === "image" ? "image/*" : props.accept}
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setError(null);
            try {
              await pick(file);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed");
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button isDisabled={busy} onPress={() => input.current?.click()}>
          {busy ? "Uploading…" : url ? "Replace" : "Upload"}
        </Button>
        {url && !busy && (
          <Button prominence="low" onPress={() => props.onChange(null)}>
            Remove
          </Button>
        )}
      </div>
    </FieldPrimitive>
  );
}
