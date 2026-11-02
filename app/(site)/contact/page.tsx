import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { pageMetadata } from "@/lib/seo";
import styles from "./contact.module.css";

const EMAIL = "inbox@studiosubtract.com";

export const metadata: Metadata = pageMetadata({
  title: "Contact — Studio Subtract",
  description: `Get in touch with Studio Subtract: ${EMAIL}`,
  path: "/contact",
});

export default function Contact() {
  return (
    <main className={styles.page}>
      <SiteNav contact />
      {/* opens the visitor's mail app with a new message to the studio */}
      <a className={styles.email} href={`mailto:${EMAIL}`}>
        {EMAIL}
      </a>
    </main>
  );
}
