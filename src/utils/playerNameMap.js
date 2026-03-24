export const playerNameMap = {
  // RCB
  "v kohli": "virat kohli",
  "rm patidar": "rajat patidar",
  "kh pandya": "krunal pandya",
  "b kumar": "bhuvneshwar kumar",
  "ma agarwal": "mayank agarwal",
  "jm sharma": "jitesh sharma",
  "pd salt": "phil salt",
  "ls livingstone": "liam livingstone",
  "r shepherd": "romario shepherd",
  "jr hazlewood": "josh hazlewood",

  // MI
  "rg sharma": "rohit sharma",
  "sa yadav": "suryakumar yadav",
  "hh pandya": "hardik pandya",
  "jj bumrah": "jasprit bumrah",
  "ta boult": "trent boult",
  "mj santner": "mitchell santner",
  "wg jacks": "will jacks",

  // CSK
  "ra jadeja": "ravindra jadeja",
  "ms dhoni": "ms dhoni",
  "m s dhoni": "ms dhoni",
  "s dube": "shivam dube",

  // SRH
  "pj cummins": "pat cummins",
  "hv patel": "harshal patel",
  "tm head": "travis head",
  "h klaasen": "heinrich klaasen",

  // KKR
  "sp narine": "sunil narine",
  "ad russell": "andre russell",
  "am rahane": "ajinkya rahane",

  // GT
  "rashid khan": "rashid khan",
  "shubman gill": "shubman gill",

  // DC
  "kl rahul": "kl rahul",
  "kuldeep yadav": "kuldeep yadav",
  "f du plessis": "faf du plessis",

  // PBKS
  "mp stoinis": "marcus stoinis",
  "ss iyer": "shreyas iyer",
  "p simran singh": "prabhsimran singh",
  "ys chahal": "yuzvendra chahal",

  // LSG
  "n pooran": "nicholas pooran",
  "rr pant": "rishabh pant",
  "mr marsh": "mitchell marsh",
  "ak markram": "aiden markram",

  // Others
  "b sai sudharsan": "sai sudharsan",
  "m shahrukh khan": "shahrukh khan",
  "r tewatia": "rahul tewatia",
  "r sai kishore": "sai kishore",
  "m prasidh krishna": "prasidh krishna",
  "mohammed siraj": "mohammed siraj",
  "arshdeep singh": "arshdeep singh",
  "ishan kishan": "ishan kishan",
  "abhishek sharma": "abhishek sharma"
};

export function cleanPlayerName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCricsheetPlayerName(rawName) {
  const cleaned = cleanPlayerName(rawName);
  return playerNameMap[cleaned] || cleaned;
}