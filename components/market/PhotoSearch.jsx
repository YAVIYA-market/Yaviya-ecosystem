import { useEffect, useRef, useState } from "react";
import { amount, imageUrl } from "../../lib/market/api";
function features(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onerror = () => reject(Error("Image inaccessible"));
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 24;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, 24, 24);
        const scale = Math.min(24 / image.width, 24 / image.height);
        const w = image.width * scale, h = image.height * scale;
        ctx.drawImage(image, (24-w)/2, (24-h)/2, w, h);
        const data = ctx.getImageData(0, 0, 24, 24).data, vector = [];
        for(let y=0; y<24; y+=4) for(let x=0; x<24; x+=4) {
          const sums=[0,0,0];
          for(let dy=0;dy<4;dy++) for(let dx=0;dx<4;dx++) for(let c=0;c<3;c++) sums[c]+=data[((y+dy)*24+x+dx)*4+c]/4080;
          vector.push(...sums);
        }
        resolve(vector);
      } catch(e) { reject(e); }
    };
    image.src=src;
  });
}
export default function PhotoSearch({products, country, onChoose}) {
  const [preview,setPreview]=useState(""), [results,setResults]=useState([]), [status,setStatus]=useState("");
  const request=useRef(0), urls=useRef([]);
  useEffect(() => () => {request.current++; urls.current.forEach(url => URL.revokeObjectURL(url));}, []);
  async function search(file) {
    if(!file) return;
    const token=++request.current;
    setResults([]);
    if(!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size>10*1024*1024) {setStatus("Choisissez une photo JPG, PNG ou WebP de moins de 10 Mo.");return;}
    const url=URL.createObjectURL(file);urls.current.push(url);setPreview(url);setStatus("Recherche dans le catalogue…");
    try {
      const target=await features(url);
      const candidates=await Promise.all(products.map(async product => {
        try {const vector=await features(imageUrl(product.img));return {product,distance:target.reduce((sum,v,i)=>sum+(v-vector[i])**2,0)/target.length};} catch {return null;}
      }));
      if(token!==request.current)return;
      const ranked=candidates.filter(Boolean).sort((a,b)=>a.distance-b.distance).slice(0,12);
      setResults(ranked.map(r=>r.product));setStatus(ranked.length?"Produits visuellement proches":"Aucune photo du catalogue accessible.");
    }catch {if(token===request.current)setStatus("Cette photo ne peut pas être lue. Essayez une autre image.");}
  }
  return <section className="yv-photo-search"><h3>Rechercher avec une photo</h3><p>Choisissez une image ou prenez une photo de l’article recherché.</p><div className="yv-fields"><label>Choisir une photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>search(e.target.files[0])}/></label><label>Prendre une photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>search(e.target.files[0])}/></label></div><small>Comparaison approximative des couleurs et des formes. Votre photo reste sur votre appareil ; la marque et le modèle ne sont pas reconnus automatiquement.</small>{preview&&<img className="yv-photo-preview" src={preview} alt="Votre photo de recherche"/>}<p role="status">{status}</p><div className="yv-photo-results">{results.map(p=><button key={p.id} onClick={()=>onChoose(p)}><img src={imageUrl(p.img)} alt={p.title}/><strong>{p.title}</strong><span>{amount(p.price,country)}</span></button>)}</div></section>;
}
