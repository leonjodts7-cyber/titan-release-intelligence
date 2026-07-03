import type { Release } from "@/types";
import type { MainCategory } from "./taxonomy";
import { classifyRelease } from "./taxonomy";
import { t } from "@/lib/i18n";

export function saleTypeLabel(release: Release): string | null {
  const main = classifyRelease(release).main;
  const event = release.drop_event_type ?? release.sale_type;

  if (main === "tickets") {
    if (event === "presale" || release.sale_type === "voorverkoop") return t("hubs.salePresale");
    if (event === "general_sale" || release.sale_type === "algemene_verkoop") return t("hubs.saleGeneral");
    return t("hubs.saleTicket");
  }
  if (main === "kaarten") {
    if (event === "preorder" || release.sale_type === "preorder") return t("hubs.salePreorder");
    return t("hubs.saleStoreRelease");
  }
  if (main === "schoenen") {
    if (release.sale_type === "raffle" || event === "release") return t("hubs.saleRaffle");
    return t("hubs.saleFcfs");
  }
  return null;
}

export function showTicketDisclaimer(release: Release): boolean {
  return classifyRelease(release).main === "tickets";
}
