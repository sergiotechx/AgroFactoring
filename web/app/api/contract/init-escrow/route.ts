import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
      .select("id, total_funding_requested")
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

    const { data: phase1 } = await supabase
      .from("crop_phases_budget")
      .select("id, phase_number, amount_requested")
      .eq("crop_id", cropId)
      .eq("phase_number", 1)
      .maybeSingle();

    if (!phase1) {
      return NextResponse.json(
        { success: false, error: "El cultivo no tiene fase 1 definida" },
        { status: 404 }
      );
    }

    const { error: insertError } = await supabase
      .from("contracts")
      .insert({
        crop_id: cropId,
        exporter_id: exporterId,
        total_amount: crop.total_funding_requested,
        current_phase: 0,
        status: "active",
        stellar_contract_id: "MOCK_CONTRACT_ID",
      });

    if (insertError) {
      return NextResponse.json(
        { success: false, error: "Error al crear el contrato" },
        { status: 500 }
      );
    }

    const txHash = `MOCK_TX_INIT_${crypto.randomUUID().split("-")[0]}`;

    return NextResponse.json(
      { success: true, tx_hash: txHash },
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
