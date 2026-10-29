import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import styles from "./contact.module.css";

export const metadata: Metadata = { title: "Contact — Studio Subtract" };

const EMAIL = "inbox@studiosubtract.com";

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
