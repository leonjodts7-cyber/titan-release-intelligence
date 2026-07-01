import { NextRequest, NextResponse } from "next/server";
import { getReleases } from "@/lib/data/releases";
import type { ReleaseFilters } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filters: ReleaseFilters = {
    search: searchParams.get("search") ?? undefined,
    priority: (searchParams.get("priority") as ReleaseFilters["priority"]) ?? undefined,
    status: (searchParams.get("status") as ReleaseFilters["status"]) ?? undefined,
    sort: (searchParams.get("sort") as ReleaseFilters["sort"]) ?? "priority",
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  };

  const releases = await getReleases(filters);
  return NextResponse.json({ releases, count: releases.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({
    message: "Release created",
    release: { id: crypto.randomUUID(), ...body },
  }, { status: 201 });
}
