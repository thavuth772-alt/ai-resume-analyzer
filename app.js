import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const fileInput=document.querySelector("#resumeFile");
const dropzone=document.querySelector("#dropzone");
const analyzeBtn=document.querySelector("#analyzeBtn");
const clearBtn=document.querySelector("#clearBtn");
const targetRole=document.querySelector("#targetRole");
const jobDescription=document.querySelector("#jobDescription");
const status=document.querySelector("#status");
const fileInfo=document.querySelector("#fileInfo");
const emptyState=document.querySelector("#emptyState");
const results=document.querySelector("#results");
let extractedText="";

function setStatus(message,kind=""){status.textContent=message;status.className="status "+kind}

function formatBytes(bytes){
  if(!bytes)return"0 B";
  const units=["B","KB","MB"],i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),units.length-1);
  return (bytes/Math.pow(1024,i)).toFixed(i?1:0)+" "+units[i];
}

async function extractPdfText(file){
  const buffer=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buffer}).promise;
  const pages=[];
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
    const page=await pdf.getPage(pageNumber);
    const content=await page.getTextContent();
    pages.push(content.items.map(item=>item.str||"").join(" "));
  }
  return pages.join("\n\n").replace(/\s+/g," ").trim();
}

async function handleFile(file){
  if(!file)return;
  if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){
    setStatus("Please choose a PDF file.","error");return;
  }
  if(file.size>5*1024*1024){
    setStatus("The PDF must be 5 MB or smaller.","error");return;
  }
  fileInfo.textContent=file.name+" · "+formatBytes(file.size)+" · ready to analyze";
  fileInfo.classList.remove("hidden");
  document.querySelector("#dropTitle").textContent=file.name;
  document.querySelector("#dropHint").textContent="PDF selected — click Analyze Resume";
  analyzeBtn.disabled=false;
  setStatus("Extracting resume text in your browser…");
  try{
    extractedText=await extractPdfText(file);
    if(extractedText.length<80)throw new Error("Not enough selectable text was found. This may be a scanned/image-only PDF.");
    setStatus("Ready. Extracted about "+extractedText.length.toLocaleString()+" characters.");
  }catch(error){
    extractedText="";analyzeBtn.disabled=true;setStatus(error.message||"Could not read the PDF.","error");
  }
}

fileInput.addEventListener("change",e=>handleFile(e.target.files[0]));
dropzone.addEventListener("dragover",e=>{e.preventDefault();dropzone.classList.add("dragging")});
dropzone.addEventListener("dragleave",()=>dropzone.classList.remove("dragging"));
dropzone.addEventListener("drop",e=>{e.preventDefault();dropzone.classList.remove("dragging");handleFile(e.dataTransfer.files[0])});

function renderList(id,items){
  const element=document.querySelector(id);element.innerHTML="";
  (Array.isArray(items)?items:[]).forEach(item=>{const li=document.createElement("li");li.textContent=item;element.appendChild(li)});
}

function renderResults(data){
  const score=Math.max(0,Math.min(100,Number(data.score)||0));
  document.querySelector("#scoreValue").textContent=score;
  document.querySelector(".score-ring").style.setProperty("--score",score);
  document.querySelector("#scoreLabel").textContent=data.scoreLabel||"Resume readiness";
  document.querySelector("#summary").textContent=data.summary||"Analysis completed.";
  const metrics=[["ATS",data.atsScore],["Skills",data.skillsScore],["Impact",data.impactScore]];
  document.querySelector("#metrics").innerHTML=metrics.map(([label,value])=>'<div class="metric"><b>'+Math.max(0,Math.min(100,Number(value)||0))+'/100</b><span>'+label+"</span></div>").join("");
  renderList("#strengths",data.strengths);
  document.querySelector("#skills").innerHTML=(Array.isArray(data.skillsToImprove)?data.skillsToImprove:[]).map(skill=>'<span class="tag">'+skill+"</span>").join("");
  renderList("#improvements",data.improvements);
  renderList("#questions",data.interviewQuestions);
  emptyState.classList.add("hidden");results.classList.remove("hidden");
}

analyzeBtn.addEventListener("click",async()=>{
  if(!extractedText)return;
  analyzeBtn.disabled=true;analyzeBtn.innerHTML="Analyzing… <span>✦</span>";
  setStatus("Sending extracted resume text to the AI analyzer…");
  try{
    const response=await fetch("/api/analyze",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        resumeText:extractedText.slice(0,50000),
        targetRole:targetRole.value.trim(),
        jobDescription:jobDescription.value.trim().slice(0,15000)
      })
    });
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||"Analysis failed.");
    renderResults(payload);setStatus("Analysis completed successfully.");
  }catch(error){setStatus(error.message||"Something went wrong.","error")}
  finally{analyzeBtn.disabled=false;analyzeBtn.innerHTML='Analyze Resume <span>→</span>'}
});

clearBtn.addEventListener("click",()=>{
  extractedText="";fileInput.value="";fileInfo.classList.add("hidden");
  document.querySelector("#dropTitle").textContent="Drop your PDF here";
  document.querySelector("#dropHint").textContent="or click to browse · maximum 5 MB";
  analyzeBtn.disabled=true;emptyState.classList.remove("hidden");results.classList.add("hidden");
  setStatus("");targetRole.value="";jobDescription.value="";
});