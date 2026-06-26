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

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, crop_id, current_phase, status")
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
    if (contract.status === "frozen") {
      return NextResponse.json(
        { success: false, error: "El contrato está congelado" },
        { status: 409 }
      );
    }

    const newPhase = (contract.current_phase ?? 0) + 1;

    const { data: phase } = await supabase
      .from("crop_phases_budget")
      .select("id, phase_number, amount_requested")
      .eq("crop_id", contract.crop_id)
      .eq("phase_number", newPhase)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json(
        {
          success: false,
          error: "No existe la fase solicitada (máximo alcanzado)",
        },
        { status: 409 }
      );
    }

    const { data: allPhases, error: allPhasesError } = await supabase
      .from("crop_phases_budget")
      .select("phase_number")
      .eq("crop_id", contract.crop_id)
      .order("phase_number", { ascending: false });

    if (allPhasesError || !allPhases) {
      return NextResponse.json(
        { success: false, error: "Error al consultar fases del cultivo" },
        { status: 500 }
      );
    }

    const maxPhase = allPhases[0]?.phase_number ?? newPhase;
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

    const txHash = `MOCK_TX_RELEASE_${newPhase}_${crypto.randomUUID().split("-")[0]}`;

    const { error: ledgerError } = await supabase
      .from("phase_ledger")
      .insert({
        contract_id: contractId,
        phase_number: newPhase,
        tx_hash: txHash,
        amount_released: phase.amount_requested,
      });

    if (ledgerError) {
      return NextResponse.json(
        { success: false, error: "Error al registrar en el ledger" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, new_phase: newPhase, tx_hash: txHash },
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
