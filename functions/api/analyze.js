export async function onRequestPost(context) {
  try {
    const body=await context.request.json();
    const resumeText=String(body.resumeText||"").trim();
    const targetRole=String(body.targetRole||"").trim();
    const jobDescription=String(body.jobDescription||"").trim();

    if(resumeText.length<80)return json({error:"Please provide a resume with enough readable text."},400);

    const apiKey=context.env.GEMINI_API_KEY;
    if(!apiKey)return json({error:"Gemini API key is not configured. Add GEMINI_API_KEY in Cloudflare Pages → Settings → Variables and Secrets."},500);

    const model=context.env.GEMINI_MODEL||"gemini-3.6-flash";
    const prompt=
      "You are an expert ATS resume reviewer and career coach.\n"+
      "Analyze the resume below. Be practical, concise, and evidence-based. Do not invent experience or skills.\n\n"+
      "Return ONLY valid JSON with exactly these keys:\n"+
      '{"score":number,"scoreLabel":string,"atsScore":number,"skillsScore":number,"impactScore":number,"summary":string,"strengths":string[],"skillsToImprove":string[],"improvements":string[],"interviewQuestions":string[]}\n\n'+
      "Rules:\n"+
      "- score and all component scores must be integers from 0 to 100.\n"+
      "- strengths: 3 to 5 items.\n"+
      "- skillsToImprove: 4 to 8 concise skills or keywords.\n"+
      "- improvements: 5 to 8 specific actions.\n"+
      "- interviewQuestions: 5 practical questions based on the resume.\n"+
      "- If a job description is supplied, prioritize matching it.\n"+
      "- Never claim that a person has a skill unless it is supported by the resume.\n\n"+
      "Target role: "+(targetRole||"Not specified")+"\n\n"+
      "Job description:\n"+(jobDescription||"Not supplied")+"\n\n"+
      "Resume:\n"+resumeText;

    const response=await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",
      {
        method:"POST",
        headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
        body:JSON.stringify({
          contents:[{parts:[{text:prompt}]}],
          generationConfig:{temperature:0.25,maxOutputTokens:1800,responseMimeType:"application/json"}
        })
      }
    );

    const data=await response.json();
    if(!response.ok)return json({error:data?.error?.message||"Gemini API request failed."},response.status);

    const text=data?.candidates?.[0]?.content?.parts?.map(part=>part.text||"").join("")||"";
    if(!text)return json({error:"The AI returned an empty response."},502);

    let result;
    try{
      result=JSON.parse(text.replace(/^\s*\`\`\`json\s*/i,"").replace(/\s*\`\`\`\s*$/i,"").trim());
    }catch{
      return json({error:"The AI response was not valid JSON. Please try again."},502);
    }
    return json(result,200);
  }catch(error){
    return json({error:error?.message||"Unexpected server error."},500);
  }
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
  });
}