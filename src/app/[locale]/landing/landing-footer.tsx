import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";

interface FooterColumn {
  title: string;
  links: string[];
}

export async function LandingFooter() {
  const t = await getTranslations("landing.footer");
  const columns = t.raw("columns") as FooterColumn[];

  return (
    <footer className="bg-white py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo size={24} />
            <p className="mt-2 text-sm text-[#65716d]">{t("tagline")}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-[#14211e]">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[#65716d] hover:text-[#14211e]">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-[#dde4e0] pt-6 text-xs text-[#8c9692]">
          {t("copyright")}
        </div>
      </div>
    </footer>
  );
}
