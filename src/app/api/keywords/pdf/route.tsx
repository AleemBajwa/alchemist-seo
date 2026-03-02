import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";

const schema = z.object({
  seedKeyword: z.string().optional().default(""),
  filters: z.object({
    country: z.string().optional().default("us"),
    language: z.string().optional().default("en"),
  }),
  keywords: z.array(
    z.object({
      keyword: z.string(),
      volume: z.number().optional(),
      difficulty: z.number().optional(),
      cpc: z.number().optional(),
      competition: z.number().optional(),
      intent: z.string().optional(),
      tags: z.string().optional(),
    })
  ).default([]),
  questions: z.array(z.string()).default([]),
});

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 10 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  meta: { color: "#666", marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginTop: 10, marginBottom: 6 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
  },
  head: { fontWeight: "bold", backgroundColor: "#f3f4f6" },
  c1: { width: "38%" },
  c2: { width: "12%" },
  c3: { width: "12%" },
  c4: { width: "10%" },
  c5: { width: "12%" },
  c6: { width: "16%" },
  listItem: { marginBottom: 3 },
});

function KeywordsPdf({
  seedKeyword,
  country,
  language,
  keywords,
  questions,
}: {
  seedKeyword: string;
  country: string;
  language: string;
  keywords: Array<{
    keyword: string;
    volume?: number;
    difficulty?: number;
    cpc?: number;
    competition?: number;
    intent?: string;
    tags?: string;
  }>;
  questions: string[];
}) {
  const topRows = keywords.slice(0, 40);
  const topQuestions = questions.slice(0, 20);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Keyword Research Report</Text>
        <Text style={styles.meta}>
          Seed: {seedKeyword || "-"} | Country: {country.toUpperCase()} | Language: {language} | Generated:{" "}
          {new Date().toLocaleDateString()}
        </Text>

        <Text style={styles.sectionTitle}>Top Keywords</Text>
        <View style={[styles.row, styles.head]}>
          <Text style={styles.c1}>Keyword</Text>
          <Text style={styles.c2}>Volume</Text>
          <Text style={styles.c3}>KD</Text>
          <Text style={styles.c4}>CPC</Text>
          <Text style={styles.c5}>Comp.</Text>
          <Text style={styles.c6}>Intent</Text>
        </View>
        {topRows.map((r, i) => (
          <View key={`${r.keyword}-${i}`} style={styles.row}>
            <Text style={styles.c1}>{r.keyword}</Text>
            <Text style={styles.c2}>{r.volume ?? 0}</Text>
            <Text style={styles.c3}>{r.difficulty ?? 0}%</Text>
            <Text style={styles.c4}>{(r.cpc ?? 0).toFixed(2)}</Text>
            <Text style={styles.c5}>{r.competition ?? 0}%</Text>
            <Text style={styles.c6}>{r.intent || "-"}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Question Suggestions</Text>
        {topQuestions.length === 0 ? (
          <Text style={styles.meta}>No question suggestions available for this query.</Text>
        ) : (
          topQuestions.map((q, i) => (
            <Text key={`${q}-${i}`} style={styles.listItem}>
              {i + 1}. {q}
            </Text>
          ))
        )}
      </Page>
    </Document>
  );
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = schema.parse(body);

    const pdfBuffer = await renderToBuffer(
      <KeywordsPdf
        seedKeyword={parsed.seedKeyword}
        country={parsed.filters.country}
        language={parsed.filters.language}
        keywords={parsed.keywords}
        questions={parsed.questions}
      />
    );

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"keyword-report.pdf\"",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "PDF_EXPORT_FAILED", message: String(error) },
      { status: 500 }
    );
  }
}

