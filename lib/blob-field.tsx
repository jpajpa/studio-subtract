// Keystatic fields that upload straight to Vercel Blob and store the file's
// public URL in the YAML. Images also store their pixel size, so the site
// never has to download them to lay out. The editor UI is in BlobPicker.
import type { BasicFormField, FormFieldStoredValue } from "@keystatic/core";
import { BlobPicker, type BlobImage } from "./BlobPicker";

export type { BlobImage };

type Options = { label: string; description?: string; folder: string; isRequired?: boolean };

function required<T>(o: Options) {
  return (value: T | null) => {
    if (o.isRequired && !value) throw new Error(`${o.label} is required`);
    return value;
  };
}

const isImage = (v: unknown): v is BlobImage =>
  typeof v === "object" && v !== null && typeof (v as BlobImage).src === "string";

/** An image on Blob, stored as { src, width, height }. */
export function blobImage(o: Options): BasicFormField<BlobImage | null> {
  const parse = (v: FormFieldStoredValue) => (isImage(v) ? v : null);
  return {
    kind: "form",
    label: o.label,
    Input: (props) => (
      <BlobPicker
        {...o}
        kind="image"
        invalid={props.forceValidation && o.isRequired === true}
        value={props.value}
        onChange={props.onChange}
      />
    ),
    defaultValue: () => null,
    parse,
    serialize: (value) => ({ value: value ?? undefined }),
    validate: required<BlobImage>(o),
    reader: { parse },
  };
}

/** Any other file on Blob (video, PDF…), stored as its URL. */
export function blobFile(o: Options & { accept: string }): BasicFormField<string | null> {
  const parse = (v: FormFieldStoredValue) => (typeof v === "string" && v ? v : null);
  return {
    kind: "form",
    label: o.label,
    Input: (props) => (
      <BlobPicker
        {...o}
        kind="file"
        invalid={props.forceValidation && o.isRequired === true}
        value={props.value}
        onChange={props.onChange}
      />
    ),
    defaultValue: () => null,
    parse,
    serialize: (value) => ({ value: value ?? undefined }),
    validate: required<string>(o),
    reader: { parse },
  };
}
