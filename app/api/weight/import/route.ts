import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import WeightEntry from "@/models/WeightEntry";

interface ImportRow {
  date: string;
  weightKg: number;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const rows: ImportRow[] = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Nessun dato da importare" }, { status: 400 });
  }

  if (rows.length > 5000) {
    return NextResponse.json({ error: "Massimo 5000 righe per importazione" }, { status: 400 });
  }

  // Validate all rows before touching the DB
  for (const row of rows) {
    if (!row.date || typeof row.weightKg !== "number") {
      return NextResponse.json({ error: "Formato dati non valido" }, { status: 400 });
    }
    if (row.weightKg < 30 || row.weightKg > 300) {
      return NextResponse.json(
        { error: `Peso fuori range (30-300 kg): ${row.weightKg} in data ${row.date}` },
        { status: 400 }
      );
    }
  }

  await connectDB();

  const ops = rows.map((row) => {
    const date = new Date(row.date);
    date.setUTCHours(0, 0, 0, 0);
    return {
      updateOne: {
        filter: { userId: session.user!.id, date },
        update: {
          $set: { userId: session.user!.id, date, weightKg: row.weightKg, createdAt: new Date() },
        },
        upsert: true,
      },
    };
  });

  const result = await WeightEntry.bulkWrite(ops, { ordered: false });

  return NextResponse.json({
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    total: rows.length,
  });
}
