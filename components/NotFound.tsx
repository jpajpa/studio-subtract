import Link from "next/link";
import styles from "@/app/(site)/contact/contact.module.css";
import { SiteNav } from "./SiteNav";

/** The 404, laid out like the contact page: one line, centred. */
export function NotFound() {
  return (
    <main className={styles.page}>
      <SiteNav lost />
      <Link className={styles.email} href="/">
        This page doesn&apos;t exist. Back to the work
      </Link>
    </main>
  );
}
