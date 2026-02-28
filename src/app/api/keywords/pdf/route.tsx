import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

type KeywordRow = {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
  intent?: string;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  meta: { color: "#666", marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 8, marginBottom: 6 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
    columnGap: 6,
  },
  head: {
    fontWeight: "bold",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
  },
  c1: { width: 180 },
  c2: { width: 55, textAlign: "right" },
  c3: { width: 46, textAlign: "right" },
  c4: { width: 40, textAlign: "right" },
  c5: { width: 45, textAlign: "right" },
  c6: { width: 80, textTransform: "capitalize" },
});

function KeywordsPdf({
  seedKeyword,
  country,
  language,
  rows,
  questionsCount,
}: {
  seedKeyword: string;
  country: string;
  language: string;
  rows: KeywordRow[];
  questionsCount: number;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Keyword Research Report</Text>
        <Text style={styles.meta}>
          Seed: {seedKeyword} • Country: {country.toUpperCase()} • Language: {language} • Generated:{" "}
          {new Date().toLocaleDateString()}
        </Text>
        <Text style={styles.meta}>
          Total keywords: {rows.length} • Question suggestions: {questionsCount}
        </Text>

        <Text style={styles.sectionTitle}>Top Keywords</Text>
        <View style={[styles.row, styles.head]}>
          <Text style={styles.c1}>Keyword</Text>
          <Text style={styles.c2}>Volume</Text>
          <Text style={styles.c3}>KD</Text>
          <Text style={styles.c4}>CPC</Text>
          <Text style={styles.c5}>Comp%</Text>
          <Text style={styles.c6}>Intent</Text>
        </View>
        {rows.slice(0, 120).map((r) => (
          <View key={r.keyword} style={styles.row}>
            <Text style={styles.c1}>{r.keyword}</Text>
            <Text style={styles.c2}>{Number(r.volume || 0).toLocaleString()}</Text>
            <Text style={styles.c3}>{r.difficulty ?? 0}%</Text>
            <Text style={styles.c4}>${Number(r.cpc || 0).toFixed(2)}</Text>
            <Text style={styles.c5}>{Math.round((r.competition || 0) * 100)}%</Text>
            <Text style={styles.c6}>{r.intent || "-"}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? (body.rows as KeywordRow[]) : [];
    const seedKeyword = typeof body?.seedKeyword === "string" ? body.seedKeyword : "keyword";
    const country = typeof body?.country === "string" ? body.country : "us";
    const language = typeof body?.language === "string" ? body.language : "en";
    const questionsCount = Number(body?.questionsCount ?? 0);

    const doc = (
      <KeywordsPdf
        seedKeyword={seedKeyword}
        country={country}
        language={language}
        rows={rows}
        questionsCount={questionsCount}
      />
    );
    const pdfBuffer = await renderToBuffer(doc);
    const pdfBytes = Buffer.isBuffer(pdfBuffer)
      ? new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength)
      : new Uint8Array(pdfBuffer as ArrayBuffer);

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"keywords-${Date.now()}.pdf\"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate keyword PDF", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
