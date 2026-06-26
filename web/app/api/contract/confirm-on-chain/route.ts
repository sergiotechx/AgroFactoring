import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const contractId = body?.contract_id;
    const txType = body?.tx_type;
    const txHash = body?.tx_hash;
    const newPhase = body?.new_phase;

    if (!contractId) {
      return NextResponse.json(
        { success: false, error: "Falta contract_id" },
        { status: 400 }
      );
    }
    if (txType !== "init" && txType !== "release") {
      return NextResponse.json(
        { success: false, error: "tx_type debe ser 'init' o 'release'" },
        { status: 400 }
      );
    }
    if (!txHash) {
      return NextResponse.json(
        { success: false, error: "Falta tx_hash" },
        { status: 400 }
      );
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, crop_id")
      .eq("id", contractId)
      .maybeSingle();

    if (contractError) {
      return NextResponse.json(
        { success: false, error: "Error al consultar el contrato" },
        { status: 500 }
      );
    }
    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contrato no encontrado" },
        { status: 404 }
      );
    }

    if (txType === "init") {
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ stellar_contract_id: txHash })
        .eq("id", contractId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Error al confirmar la inicialización" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (typeof newPhase !== "number") {
      return NextResponse.json(
        { success: false, error: "Falta new_phase para tx_type 'release'" },
        { status: 400 }
      );
    }

    const { data: phase } = await supabase
      .from("crop_phases_budget")
      .select("amount_requested")
      .eq("crop_id", contract.crop_id)
      .eq("phase_number", newPhase)
      .maybeSingle();

    const amountReleased = phase?.amount_requested ?? null;

    const { data: allPhases } = await supabase
      .from("crop_phases_budget")
      .select("phase_number")
      .eq("crop_id", contract.crop_id)
      .order("phase_number", { ascending: false });

    const maxPhase = allPhases && allPhases.length > 0 ? allPhases[0].phase_number : newPhase;
    const newStatus = newPhase >= maxPhase ? "completed" : "active";

    const { error: updateError } = await supabase
      .from("contracts")
      .update({ current_phase: newPhase, status: newStatus })
      .eq("id", contractId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Error al avanzar la fase" },
        { status: 500 }
      );
    }

    const { error: ledgerError } = await supabase
      .from("phase_ledger")
      .insert({
        contract_id: contractId,
        phase_number: newPhase,
        tx_hash: txHash,
        amount_released: amountReleased,
      });

    if (ledgerError) {
      return NextResponse.json(
        { success: false, error: "Error al registrar en el ledger" },
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
