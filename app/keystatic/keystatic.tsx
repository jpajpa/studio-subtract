"use client";

import { makePage } from "@keystatic/next/ui/app";
import { setBlobPicker } from "@/lib/blob-field";
import { BlobPicker } from "@/lib/BlobPicker";
import config from "@/keystatic.config";

setBlobPicker(BlobPicker);

export default makePage(config);
