const replacements: Array<[RegExp, string]> = [
  [/\bINTRODUCAO\b/g, "INTRODUÇÃO"],
  [/\bIntroducao\b/g, "Introdução"],
  [/\bintroducao\b/g, "introdução"],
  [/\bMETODO\b/g, "MÉTODO"],
  [/\bMetodo\b/g, "Método"],
  [/\bmetodo\b/g, "método"],
  [/\bINTENCAO\b/g, "INTENÇÃO"],
  [/\bIntencao\b/g, "Intenção"],
  [/\bintencao\b/g, "intenção"],
  [/\bANALISE\b/g, "ANÁLISE"],
  [/\banalise\b/g, "análise"],
  [/\bAnalise\b/g, "Análise"],
  [/\bDOMINANCIA\b/g, "DOMINÂNCIA"],
  [/\bDominancia\b/g, "Dominância"],
  [/\bdominancia\b/g, "dominância"],
  [/\bOTIMIZACAO\b/g, "OTIMIZAÇÃO"],
  [/\bOtimizacao\b/g, "Otimização"],
  [/\botimizacao\b/g, "otimização"],
  [/\bREVISAO\b/g, "REVISÃO"],
  [/\bRevisao\b/g, "Revisão"],
  [/\brevisao\b/g, "revisão"],
  [/\bOPERACAO\b/g, "OPERAÇÃO"],
  [/\bOperacao\b/g, "Operação"],
  [/\boperacao\b/g, "operação"],
  [/\bOBRIGATORIA\b/g, "OBRIGATÓRIA"],
  [/\bobrigatoria\b/g, "obrigatória"],
  [/\bObrigatoria\b/g, "Obrigatória"],
  [/\bPRATICA\b/g, "PRÁTICA"],
  [/\bPratica\b/g, "Prática"],
  [/\bpratica\b/g, "prática"],
  [/\bCONTEUDO\b/g, "CONTEÚDO"],
  [/\bConteudo\b/g, "Conteúdo"],
  [/\bconteudo\b/g, "conteúdo"],
  [/\bCONTEUDOS\b/g, "CONTEÚDOS"],
  [/\bConteudos\b/g, "Conteúdos"],
  [/\bconteudos\b/g, "conteúdos"],
];

export function formatPtText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return replacements.reduce(
    (currentValue, [pattern, replacement]) => currentValue.replace(pattern, replacement),
    value,
  );
}
