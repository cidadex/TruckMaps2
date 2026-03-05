import { db } from "./db";
import { funcionarios, empresas, transportadoras } from "@shared/schema";

const csvData = `NOME,PIN,CARGO,Nova ordem de serviço,Diagnóstico Técnico,Manutenção ,Qualidade,Aguardando peça ,Aguardando Aprovação ,Acompanhar o.s,Laudo técnico
ACÁCIO DOS SANTOS,2197,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
CARLOS HENRIQUE PEREIRA CAVALCANTE,2449,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
CLAUDIO TATTERO,2942,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
GILSON BARBOSA,2773,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
JOSÉ GERMANO DA SILVA,2096,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
LUCAS PRADO DOS SANTOS,2857,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
MAURICIO GERONIMO DA SILVA JUNIOR,2918,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
RICHARD ALBERTO MORENO DA SILVA,2088,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
WISLASH KAYSON COSTA SILVA,2190,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
WLISSYS GUILHERME DOS REIS RIBEIRO,2867,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
BRUNO BARBOSA DE ALMEIDA,2457,Auxiliar Mecânico,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
CARLOS ANDERSON SILVA MOURA,3287,Borracheiro,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
MARCOS DA MATA,3347,Borracheiro,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
DOUGLAS ALVES MARCONDES,4665,Eletricista,SIM,NÃO,SIM,NÃO,SIM,SIM,SIM,NÃO
MATHEUS RODRIGUES DA SILVA,5678,QUALIDADE,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
JAIR RAMOS DOS SANTOS,5909,QUALIDADE,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
CLAUDIO DA CONCEICAO SANTANA,6756,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
DIEGO CESAR SANTOS NEVES,6506,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
EVERSON APARECIDO GARCIA,6380,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
FRANCISCO EMERSON FERREIRA DE OLIVEIRA,6189,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
GABRIEL PIRES DE MORAIS,6807,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
JOSIMAR MARTINS DE MORAES,6741,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
MANOEL CARLOS PAULINO NETO,6407,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
MAURO CESAR DE OLIVEIRA SIQUEIRA,6506,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
MICHAEL VINICIUS LOPES COSTA,6842,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
THIAGO VILAS BOAS,6798,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
WELTMAN ALVES DE ARAUJO,6811,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
EVANDRO LIMA SANTOS,6023,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
YEINER ALFONSO MORA PAJOY,6946,Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
ANDREIVIS AUGUSTO DOS SANTOS,7893,Soldador Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
CARLOS ROBERTO SILVA COSTA,7457,Soldador Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
JOSE VALNEI DA CONCEICAO REIS,7424,Soldador Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
WILSON DE OLIVEIRA LAVRAS,7354,Soldador Mecânico,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
ARLI GALDINO GALVÃO,8077,Soldador,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
ADONIAS DE SOUZA LIMA,8409,Soldador,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
FLÁVIO DOS SANTOS SANTIAGO,8709,Soldador,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
JULIANO HENRIQUE NEVES,8957,Soldador,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
RICHARD DOS SANTOS,8631,Soldador,SIM,SIM,SIM,SIM,SIM,SIM,SIM,NÃO
DANIEL GISOLFI,1911,Analista,SIM,SIM,SIM,SIM,SIM,SIM,SIM,SIM
PAULO CESAR ZANINI,1286,TÉCNICO ATRUCK,NÃO,NÃO,NÃO,NÃO,NÃO,NÃO,NÃO,SIM
NILSON FARIA NETTO,1024,TÉCNICO SUZANO,NÃO,NÃO,NÃO,NÃO,NÃO,NÃO,NÃO,SIM`;

async function seed() {
  console.log("Iniciando seed dos funcionários...");
  
  const lines = csvData.trim().split("\n");
  const header = lines[0].split(",");
  
  let inserted = 0;
  let skipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const nome = values[0].trim();
    const pin = values[1].trim();
    const cargo = values[2].trim();
    
    const toBoolean = (val: string) => val.trim().toUpperCase() === "SIM";
    
    try {
      await db.insert(funcionarios).values({
        nome,
        pin,
        cargo,
        permNovaOs: toBoolean(values[3]),
        permDiagnostico: toBoolean(values[4]),
        permManutencao: toBoolean(values[5]),
        permQualidade: toBoolean(values[6]),
        permAguardandoPeca: toBoolean(values[7]),
        permAguardandoAprovacao: toBoolean(values[8]),
        permAcompanharOs: toBoolean(values[9]),
        permLaudoTecnico: toBoolean(values[10]),
        ativo: true,
      }).onConflictDoNothing();
      inserted++;
      console.log(`✓ ${nome} (PIN: ${pin})`);
    } catch (error: any) {
      if (error.code === "23505") {
        skipped++;
        console.log(`- ${nome} (PIN já existe, pulando)`);
      } else {
        console.error(`✗ Erro ao inserir ${nome}:`, error.message);
      }
    }
  }
  
  console.log(`\nSeed concluído: ${inserted} inseridos, ${skipped} pulados`);
  
  // Seed empresas
  console.log("\nIniciando seed das empresas...");
  const listaEmpresas = ["SUZANO", "LIBRELATO", "TKA", "PHD", "MANOS", "IBERO", "OUTRA EMPRESA"];
  for (const nome of listaEmpresas) {
    try {
      await db.insert(empresas).values({ nome, ativo: true }).onConflictDoNothing();
      console.log(`✓ Empresa: ${nome}`);
    } catch (error: any) {
      console.log(`- Empresa ${nome} já existe`);
    }
  }
  
  // Seed transportadoras
  console.log("\nIniciando seed das transportadoras...");
  const listaTransportadoras = [
    "LIBRELATO", "RODOBEPE", "JVM LOG", "NACIONAL", "BOOMERANG", "3 PINHEIROS",
    "RCR", "DGI", "VALE MIX", "BRL TRANSPORTES", "NELGER", "SOARES",
    "PRADO MENDES", "DIVINO", "LB PRADO", "BRANCO", "ENFOQUE"
  ];
  for (const nome of listaTransportadoras) {
    try {
      await db.insert(transportadoras).values({ nome, ativo: true }).onConflictDoNothing();
      console.log(`✓ Transportadora: ${nome}`);
    } catch (error: any) {
      console.log(`- Transportadora ${nome} já existe`);
    }
  }
  
  console.log("\nTodos os seeds concluídos!");
  process.exit(0);
}

seed().catch(console.error);
