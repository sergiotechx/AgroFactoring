import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STROOPS_PER_UNIT = 10_000_000;

function toStroops(amount: string | number | null | undefined): bigint {
  if (amount === null || amount === undefined) return BigInt(0);
  return BigInt(Math.round(Number(amount) * STROOPS_PER_UNIT));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cropId = body?.crop_id;
    const exporterId = body?.exporter_id;

    if (!cropId || !exporterId) {
      return NextResponse.json(
        { success: false, error: "Faltan crop_id o exporter_id" },
        { status: 400 }
      );
    }

    const { data: crop, error: cropError } = await supabase
      .from("crops")
      .select("id, farmer_id, total_funding_requested, crop_id_num")
      .eq("id", cropId)
      .maybeSingle();

    if (cropError) {
      return NextResponse.json(
        { success: false, error: "Error al consultar el cultivo" },
        { status: 500 }
      );
    }
    if (!crop) {
      return NextResponse.json(
        { success: false, error: "Cultivo no encontrado" },
        { status: 404 }
      );
    }

    const { data: farmer, error: farmerError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", crop.farmer_id)
      .maybeSingle();

    if (farmerError) {
      return NextResponse.json(
        { success: false, error: "Error al consultar el agricultor" },
        { status: 500 }
      );
    }
    if (!farmer || !farmer.wallet_address) {
      return NextResponse.json(
        { success: false, error: "Agricultor sin wallet_address" },
        { status: 404 }
      );
    }

    const { data: phase1, error: phaseError } = await supabase
      .from("crop_phases_budget")
      .select("amount_requested")
      .eq("crop_id", cropId)
      .eq("phase_number", 1)
      .maybeSingle();

    if (phaseError) {
      return NextResponse.json(
        { success: false, error: "Error al consultar la fase 1" },
        { status: 500 }
      );
    }
    if (!phase1) {
      return NextResponse.json(
        { success: false, error: "El cultivo no tiene fase 1 definida" },
        { status: 404 }
      );
    }

    const { data: existing } = await supabase
      .from("contracts")
      .select("id, stellar_contract_id")
      .eq("crop_id", cropId)
      .eq("exporter_id", exporterId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let contractIdDb: string;

    if (existing) {
      if (existing.stellar_contract_id) {
        return NextResponse.json(
          {
            success: false,
            error: "El contrato ya fue inicializado on-chain",
          },
          { status: 409 }
        );
      }
      contractIdDb = existing.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("contracts")
        .insert({
          crop_id: cropId,
          exporter_id: exporterId,
          total_amount: crop.total_funding_requested,
          current_phase: 0,
          status: "active",
          stellar_contract_id: null,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        return NextResponse.json(
          { success: false, error: "Error al crear el contrato en base de datos" },
          { status: 500 }
        );
      }
      contractIdDb = inserted.id;
    }

    return NextResponse.json(
      {
        success: true,
        contract_id: contractIdDb,
        farmer_address: farmer.wallet_address,
        crop_id_num: crop.crop_id_num,
        total_amount_stroops: toStroops(crop.total_funding_requested).toString(),
        phase_amount_stroops: toStroops(phase1.amount_requested).toString(),
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
