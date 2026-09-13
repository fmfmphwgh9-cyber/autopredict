import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    teamA: {type:"string"}, teamB:{type:"string"},
    competition:{type:["string","null"]},
    probabilities:{type:"object",additionalProperties:false,properties:{
      home:{type:"number"},draw:{type:"number"},away:{type:"number"}
    },required:["home","draw","away"]},
    odds:{type:"object",additionalProperties:false,properties:{
      home:{type:["string","null"]},draw:{type:["string","null"]},away:{type:["string","null"]}
    },required:["home","draw","away"]},
    confidence:{type:"number"},
    analysis:{type:"string"},
    formA:{type:"string"},formB:{type:"string"},
    mirrorMatches:{type:"array",items:{type:"object",additionalProperties:false,properties:{
      description:{type:"string"},similarity:{type:"number"}
    },required:["description","similarity"]}},
    sources:{type:"array",items:{type:"string"}}
  },
  required:["teamA","teamB","competition","probabilities","odds","confidence","analysis","formA","formB","mirrorMatches","sources"]
};

export async function POST(req:Request){
  try{
    const {teamA,teamB,competition}=await req.json();
    if(!teamA||!teamB) return NextResponse.json({error:"Les deux équipes sont obligatoires."},{status:400});
    if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:"OPENAI_API_KEY manquante. Copie .env.example vers .env.local et ajoute ta clé API."},{status:500});

    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const model=process.env.OPENAI_MODEL||"gpt-5.6-luna";
    const prompt=`Tu es le moteur d'analyse sportive d'une application. Analyse le match ${teamA} vs ${teamB}${competition?` (${competition})`:""}.
Utilise obligatoirement la recherche web avant de répondre. Cherche des données récentes et datées: forme sur les 5 à 10 derniers matchs, buts marqués/encaissés, domicile/extérieur, confrontations directes, absences si fiables, classement et calendrier proche. Cherche aussi les cotes 1X2 actuellement visibles sur des sources publiques; si une cote 1xbet est réellement trouvée, indique-la, sinon null. Ne fabrique jamais une cote ou une statistique.
Calcule des probabilités 1X2 qui totalisent 100 (elles restent des estimations, pas des certitudes). Donne une analyse concise et une confiance de 0 à 100. Ajoute jusqu'à 5 matchs historiques réellement similaires trouvés sur le web, avec un score de similarité 0-100. Cite les URLs des sources utilisées. Réponds uniquement avec le JSON demandé.`;

    const response=await client.responses.create({
      model,
      tools:[{type:"web_search"}],
      input:prompt,
      text:{format:{type:"json_schema",name:"match_analysis",strict:true,schema}}
    });
    const data=JSON.parse(response.output_text);
    return NextResponse.json(data);
  }catch(e:any){
    console.error(e);
    return NextResponse.json({error:e?.message||"Erreur pendant l'analyse."},{status:500});
  }
}