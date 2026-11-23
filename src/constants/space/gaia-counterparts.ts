// Each identifier is verified against the linked cross-identification; validate-catalog checks it sits on the system in the shipped Gaia sample.
export const gaiaCounterparts = [
  {
    sourceId: '5853498713190525696',
    systemId: 'alpha-centauri',
    bodyId: 'proxima-centauri',
    reference: 'https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Proxima+Centauri',
  },
  {
    sourceId: '4472832130942575872',
    systemId: 'barnard-star',
    bodyId: 'barnard',
    reference: 'https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Barnard%27s+star',
  },
  {
    sourceId: '2947050466531873024',
    systemId: 'sirius',
    bodyId: 'sirius-b',
    reference: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=alf+CMa+B',
  },
  {
    sourceId: '5164707970261890560',
    systemId: 'epsilon-eridani',
    bodyId: 'epsilon-eridani-star',
    reference: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=eps+Eri',
  },
  {
    sourceId: '3796072592206250624',
    systemId: 'ross-128',
    bodyId: 'ross-128-star',
    reference: 'https://simbad.u-strasbg.fr/simbad/sim-basic?Ident=Ross+128',
  },
  {
    sourceId: '2635476908753563008',
    systemId: 'trappist-1',
    bodyId: 'trappist-1-star',
    reference: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=TRAPPIST-1',
  },
  {
    sourceId: '2768048564768256512',
    systemId: 'gliese-12',
    bodyId: 'gliese-12-star',
    reference: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Gliese+12',
  },
  {
    sourceId: '2371032916186181760',
    systemId: 'lhs-1140',
    bodyId: 'lhs-1140-star',
    reference: 'https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=LHS1140',
  },
  {
    sourceId: '2835207319109249920',
    systemId: '51-pegasi',
    bodyId: '51-pegasi-a',
    reference: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=51+Peg',
  },
] as const;
