import { storage } from "../server/storage";

const VEICULOS_INICIAIS = [
  { placa: "ABC-1234", tipo: "Bitrem Florestal", empresa: "Suzano" },
  { placa: "DEF-5678", tipo: "Rodotrem", empresa: "Suzano" },
  { placa: "JKL-3456", tipo: "Tritrem Florestal", empresa: "Suzano" },
  { placa: "MNO-7890", tipo: "Bitrem Florestal", empresa: "Gafa" },
  { placa: "PQR-1122", tipo: "Bitrem Florestal", empresa: "Suzano" },
  { placa: "STU-3344", tipo: "Tritrem Florestal", empresa: "Gafa" },
  { placa: "BCD-9900", tipo: "Tritrem Florestal", empresa: "Suzano" },
  { placa: "EFG-2211", tipo: "Rodotrem", empresa: "Gafa" },
  { placa: "KLM-6655", tipo: "Tritrem Florestal", empresa: "Gafa" },
  { placa: "NOP-8877", tipo: "Rodotrem", empresa: "Suzano" },
  { placa: "QRS-0099", tipo: "Bitrem Florestal", empresa: "Gafa" },
];

async function seed() {
  console.log("Populando veículos...");
  for (const v of VEICULOS_INICIAIS) {
    const existing = await storage.getVeiculoByPlaca(v.placa);
    if (!existing) {
      await storage.createVeiculo(v);
      console.log(`Veículo ${v.placa} criado.`);
    }
  }
  console.log("Seed finalizado.");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
