// All numbers transcribed from the SEVERE++ paper tables (Tables 3-10).
// Column order of each array is documented in COLS below.
// null = not reported / not applicable.
const FAM = {
  cnn: { name: "CNN", long: "CNN, contrastive (R(2+1)D-18)", color: "var(--cnn)" },
  vo:  { name: "Video-only ViT", long: "Video-only transformer (ViT-B)", color: "var(--vo)" },
  vt:  { name: "Video-text ViT", long: "Video-text transformer (ViT-B)", color: "var(--vt)" },
};

// ft:  finetune  [K400, UCF101, NTU60, Gym99, SSv2, EK100]
// lin: linear    [K400, UCF101, NTU60, Gym99, SSv2, EK100]
// smp: 1000 finetuning samples  [UCF101, Gym99]
// act: [Gym99, Vault, Floor, FX-S1, UB-S1, Gym288]
// tsk: [STAD, RepCount(lower=better), ArrowOfTime, TAL | MLC, STAD-ood, TAL-ood]
const M = [
 // ---- CNNs
 {id:"MoCo", fam:"cnn", obj:"Contrastive", data:"K400 · 240K", ft:[64.3,83.3,93.4,90.7,57.1,26.4], lin:[34.5,65.4,16.0,21.2,7.4,21.4], smp:[60.6,29.0], act:[86.5,33.2,83.3,65.0,84.5,55.1], tsk:[.416,.208,80.3,41.2,8.3,11.7,34.5]},
 {id:"VideoMoCo", fam:"cnn", obj:"Video contrastive", data:"K400 · 240K", ft:[65.0,84.9,94.1,90.3,59.0,43.6], lin:[31.0,66.3,51.6,41.6,19.5,25.7], smp:[65.8,19.1], act:[85.9,28.4,79.5,57.3,83.9,54.1], tsk:[.440,.185,72.9,44.1,10.5,13.1,34.7]},
 {id:"SeLaVi", fam:"cnn", obj:"Audio-visual clustering", data:"K400 · 240K", ft:[65.5,85.2,92.8,88.9,56.2,33.8], lin:[24.1,51.2,15.7,20.2,4.5,22.4], smp:[69.1,28.3], act:[84.5,25.4,76.0,51.3,80.9,52.8], tsk:[.419,.162,77.4,31.9,8.4,10.2,34.9]},
 {id:"Pretext-Contrast", fam:"cnn", obj:"Pretext + contrastive", data:"K400 · 240K", ft:[66.1,87.7,93.9,90.5,56.9,34.3], lin:[22.4,57.2,17.6,30.0,10.9,20.0], smp:[62.7,25.9], act:[86.0,28.5,81.4,66.1,86.1,52.7], tsk:[.462,.164,77.2,41.0,8.9,12.7,34.7]},
 {id:"RSPNet", fam:"cnn", obj:"Speed + contrastive", data:"K400 · 240K", ft:[66.4,88.7,93.9,91.1,59.0,42.7], lin:[46.0,76.6,33.5,32.2,12.5,24.9], smp:[75.6,32.2], act:[86.9,33.4,82.7,65.4,83.6,55.2], tsk:[.467,.145,87.0,49.5,9.0,14.1,35.9]},
 {id:"AVID-CMA", fam:"cnn", obj:"Audio-visual contrastive", data:"K400 · 240K", ft:[66.6,88.8,94.0,90.4,52.0,29.9], lin:[43.5,78.1,53.9,45.1,16.1,22.5], smp:[68.8,32.1], act:[85.7,30.4,82.7,68.0,87.3,52.5], tsk:[.435,.148,83.3,43.8,8.2,10.0,35.5]},
 {id:"CtP", fam:"cnn", obj:"Trajectory prediction", data:"K400 · 240K", ft:[67.1,90.1,94.3,92.0,59.6,42.8], lin:[7.6,37.9,22.6,30.6,12.2,20.0], smp:[63.7,31.2], act:[88.1,26.8,86.2,79.1,88.8,56.5], tsk:[.465,.178,77.1,33.5,9.6,10.0,33.2]},
 {id:"TCLR", fam:"cnn", obj:"Temporal contrastive", data:"K400 · 240K", ft:[68.1,90.8,94.1,91.6,59.8,36.2], lin:[19.9,63.3,33.5,33.0,10.8,21.8], smp:[70.5,24.4], act:[87.7,29.8,84.3,60.7,84.7,55.4], tsk:[.476,.142,85.6,32.4,12.2,10.8,34.3]},
 {id:"Tubelet-Contrast", fam:"cnn", obj:"Motion contrastive", data:"K400 · 240K", ft:[65.8,91.0,93.7,92.8,60.2,43.1], lin:[7.2,37.1,22.1,28.5,11.4,18.8], smp:[67.7,44.6], act:[88.9,28.4,87.7,80.1,91.0,57.4], tsk:[.463,.150,79.1,35.5,9.9,10.3,35.4]},
 {id:"GDT", fam:"cnn", obj:"Multi-modal contrastive", data:"K400 · 240K", ft:[67.1,91.3,93.9,90.5,58.0,37.3], lin:[38.6,75.7,38.2,34.2,11.9,25.3], smp:[77.8,44.0], act:[86.6,36.9,83.6,66.0,83.4,55.4], tsk:[.463,.123,76.4,48.7,8.5,12.6,35.9]},
 {id:"Supervised", fam:"cnn", sup:true, obj:"Supervised (K400 labels)", data:"K400 · 240K", ft:[null,91.4,93.9,92.1,60.8,47.7], lin:[null,91.7,45.5,42.7,16.6,26.6], smp:[86.0,51.2], act:[88.6,37.7,86.1,79.0,87.1,58.4], tsk:[.482,.132,77.0,60.7,23.5,17.9,36.3]},
 // ---- video-only transformers
 {id:"EVEREST", fam:"vo", obj:"Motion-rich masked modeling", data:"K400 · 240K", ft:[79.0,93.3,92.3,88.2,68.0,62.2], lin:[14.1,51.8,20.3,23.3,14.5,30.5], smp:[56.1,27.0], act:[81.9,24.9,71.7,39.0,88.0,44.7], tsk:[.789,.174,93.6,57.3,17.8,24.8,36.9]},
 {id:"MVD", fam:"vo", obj:"Feature distillation", data:"K400 · 240K", ft:[79.7,94.0,90.0,82.5,68.5,60.2], lin:[18.7,49.1,11.5,22.7,12.2,29.7], smp:[67.1,20.1], act:[74.6,25.1,58.6,31.3,50.5,36.5], tsk:[.762,.184,90.1,59.3,16.1,22.0,37.6]},
 {id:"MGMAE", fam:"vo", obj:"Motion-guided masked modeling", data:"K400 · 240K", ft:[79.9,95.2,92.9,87.2,68.9,63.0], lin:[24.9,64.4,25.3,26.1,16.8,33.2], smp:[77.2,24.1], act:[80.9,23.9,69.8,33.7,79.5,41.7], tsk:[.793,.181,96.8,56.3,17.9,26.9,37.3]},
 {id:"VideoMAE", fam:"vo", obj:"Masked video modeling", data:"K400 · 240K", ft:[80.0,94.2,91.1,86.8,68.6,62.7], lin:[20.7,58.6,24.3,23.9,17.5,33.2], smp:[74.6,25.9], act:[73.8,21.6,71.3,42.8,65.3,41.6], tsk:[.788,.172,97.8,58.6,14.4,26.6,37.3]},
 {id:"MGM", fam:"vo", obj:"Motion-guided masked modeling", data:"K400 · 240K", ft:[80.6,96.0,93.0,89.1,71.1,62.9], lin:[19.8,62.5,31.6,25.8,21.7,32.4], smp:[null,null], act:[83.7,21.6,76.2,38.6,86.9,46.8], tsk:[.788,.152,98.2,62.0,22.5,27.3,37.6]},
 {id:"MME", fam:"vo", obj:"Motion (HOG) prediction", data:"K400 · 240K", ft:[80.7,95.8,93.1,90.7,70.1,62.9], lin:[19.1,56.0,32.9,29.0,16.6,32.2], smp:[79.2,32.8], act:[85.7,21.7,80.4,57.0,91.2,48.6], tsk:[.793,.155,98.9,61.8,23.6,26.6,37.4]},
 {id:"SIGMA", fam:"vo", obj:"Semantic (DINO) reconstruction", data:"K400 · 240K", ft:[81.3,95.4,94.0,89.7,70.9,63.5], lin:[47.5,80.7,34.4,30.1,20.8,34.2], smp:[82.9,27.2], act:[84.4,23.1,77.7,55.1,79.9,47.4], tsk:[.793,.178,94.0,62.7,22.4,27.3,37.8]},
 {id:"Supervised", fam:"vo", sup:true, obj:"Supervised (K400 labels)", data:"K400 · 240K", ft:[null,93.6,87.2,76.5,59.5,56.9], lin:[null,92.4,60.3,42.0,24.8,37.5], smp:[81.8,23.8], act:[68.1,26.4,54.6,35.7,63.1,32.9], tsk:[.761,.381,98.2,60.9,17.3,18.1,36.9]},
 // ---- video-text transformers
 {id:"LocoMotion", fam:"vt", obj:"VTC + VTM + MLM, synthetic motion", data:"WebVid · 2.5M", ft:[78.2,92.0,92.5,89.5,66.7,46.3], lin:[49.8,81.4,32.4,29.1,15.8,27.4], smp:[79.5,23.6], act:[84.2,32.0,80.6,59.0,68.5,48.0], tsk:[.645,.490,53.1,59.5,35.0,9.3,37.5]},
 {id:"VindLU", fam:"vt", obj:"VTC + VTM + MLM", data:"WebVid · 25M", ft:[79.1,94.5,92.0,89.3,66.7,47.2], lin:[54.4,85.4,43.8,31.2,17.2,28.4], smp:[84.0,25.6], act:[84.2,28.3,79.8,59.6,66.7,47.8], tsk:[.641,.490,53.0,60.1,37.7,9.4,37.9]},
 {id:"UMT", fam:"vt", obj:"Masked modeling + VTC + VTM + MLM", data:"K700 + WebVid · 25M", ft:[81.7,96.0,94.0,89.9,70.1,50.1], lin:[63.5,88.0,42.9,26.4,18.8,28.2], smp:[78.4,26.5], act:[84.6,27.6,82.9,68.0,68.0,48.0], tsk:[.723,.321,57.5,65.5,44.9,22.3,37.0]},
 {id:"CLIP", fam:"vt", obj:"Image-text contrastive", data:"CLIP-400M", ft:[81.8,93.6,93.2,88.0,66.7,50.3], lin:[56.5,77.5,21.2,20.7,11.3,25.1], smp:[82.5,21.8], act:[82.8,31.9,69.8,48.0,49.4,46.3], tsk:[.638,.520,50.1,48.8,34.9,8.9,36.0]},
 {id:"ViCLIP", fam:"vt", obj:"Video-text contrastive", data:"InternVid · 10M", ft:[82.4,95.2,93.7,89.7,67.9,55.0], lin:[65.3,86.7,35.1,27.3,18.9,27.3], smp:[79.4,22.1], act:[84.9,27.1,77.2,57.3,60.7,49.5], tsk:[.674,.450,89.5,59.6,38.9,14.9,36.7]},
];
M.forEach((m, i) => { m.key = m.sup ? "Supervised · " + FAM[m.fam].name : m.id; m.i = i; });

// Every individual "setting" a method can be scored on.
// get(m) returns the raw score; hi = higher is better.
const DS = ["Kinetics-400", "UCF-101", "NTU-60", "FineGym-99", "Something-Something v2", "EPIC-Kitchens-100"];
const DSs = ["K400", "UCF-101", "NTU-60", "Gym-99", "SS-v2", "EK-100"];
const S = {};
const add = (id, factor, label, get, o = {}) => (S[id] = { id, factor, label, get, hi: true, fmt: v => v.toFixed(1), ...o });
DSs.forEach((d, i) => {
  add("ft" + i, "domain", d + " · finetune", m => m.ft[i]);
  add("lin" + i, "domain", d + " · linear", m => m.lin[i]);
});
add("s0", "samples", "UCF-101 · 1k samples", m => m.smp[0]);
add("s1", "samples", "Gym-99 · 1k samples", m => m.smp[1]);
["Gym-99 (all events)", "Vault", "Floor", "FX-S1", "UB-S1", "Gym-288"].forEach((l, i) =>
  add("a" + i, "actions", l, m => m.act[i]));
add("t0", "tasks", "Spatio-temporal detection (mAP)", m => m.tsk[0], { fmt: v => v.toFixed(3) });
add("t1", "tasks", "Repetition counting (error ↓)", m => m.tsk[1], { hi: false, fmt: v => v.toFixed(3) });
add("t2", "tasks", "Arrow of time", m => m.tsk[2]);
add("t3", "tasks", "Temporal action localization", m => m.tsk[3]);
add("t4", "tasks", "Multi-label recognition (Charades)", m => m.tsk[4]);
add("t5", "tasks", "Spatio-temporal detection (AVA, out of domain)", m => m.tsk[5]);
add("t6", "tasks", "Temporal action localization (ActivityNet, out of domain)", m => m.tsk[6]);

// The SEVERE++ benchmark columns (Table 10): 4 factors x 2 settings.
const BENCH = [
  { id: "ft4", factor: "domain", short: "SS-v2" },
  { id: "ft3", factor: "domain", short: "Gym-99" },
  { id: "s0", factor: "samples", short: "UCF · 1k" },
  { id: "s1", factor: "samples", short: "Gym · 1k" },
  { id: "a3", factor: "actions", short: "FX-S1" },
  { id: "a4", factor: "actions", short: "UB-S1" },
  { id: "t1", factor: "tasks", short: "UCF-RC" },
  { id: "t4", factor: "tasks", short: "Charades" },
];
