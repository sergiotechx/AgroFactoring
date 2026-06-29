import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const contractId = body?.contract_id;

    if (!contractId) {
      return NextResponse.json(
        { success: false, error: "Falta contract_id" },
        { status: 400 }
      );
    }

    const { data: contract, error: fetchError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .maybeSingle();

    if (fetchError || !contract) {
      return NextResponse.json(
        { success: false, error: "Contrato no encontrado" },
        { status: 404 }
      );
    }

    // Delete ledger entries
    await supabase
      .from("phase_ledger")
      .delete()
      .eq("contract_id", contractId);

    // Reset contract to initial state
    const { error: updateError } = await supabase
      .from("contracts")
      .update({
        stellar_contract_id: null,
        current_phase: 0,
        status: "active",
        emulator_active: false,
        emulator_started_at: null,
      })
      .eq("id", contractId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Error al resetear el contrato" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
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
