import type { Metadata } from "next";
import "@/styles/reset.css";
import "@/styles/themes/jp.css";
import "@/styles/tokens.css";
import "@/styles/globals.css";
import { catalogue } from "@/data/catalogues";
import { Providers } from "./providers";

const title = "Vending machine";
const description =
  "A vending machine that gives change with the fewest coins.";

export const metadata: Metadata = {
  title,
  description,
  authors: [{ name: "Wioletta Gluza", url: "https://github.com/w-gluza" }],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "en_GB",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme={catalogue.id}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
