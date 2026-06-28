quels sont les grandes ontologies qui gère l'état civil en belgique/France dans ces ontologies comment gère ton la notion de groupe de personne ( propiétaire d'un bien etc ?)
sur base de ces post-it pour une agence de syndic en belgique
comment devrait-on organiser et les taxonomies internes de la société

Oui, dans ce cas tu as raison : le groupe doit devenir une entité historisée, parce qu’il porte une responsabilité de facturation à une période donnée.

La règle doit donc être raffinée :

Créer un groupe si le collectif est utilisé comme unité de gestion, de facturation, de responsabilité ou d’historique.
Si sa composition change, on clôture l’ancien groupe et on crée une nouvelle version du groupe.

Autrement dit, il ne faut pas seulement modéliser :

Jean possède 33 %
Pauline possède 33 %
Fils possède 33 %

Il faut aussi modéliser :

GroupePropriétaire_LotA3_v1
→ membres : Jean, Pauline, Fils
→ période : du 01/01/2020 au 15/03/2024
→ responsable de facturation : Jean + Pauline + Fils

Puis après décès :

GroupePropriétaire_LotA3_v2
→ membres : Pauline, Fils
→ période : à partir du 16/03/2024
→ responsable de facturation : Pauline + Fils
→ cause de changement : décès de Jean
1. Distinction essentielle : droit réel vs unité de facturation

Il faut séparer deux choses :

1. Qui détient juridiquement le lot ?
2. À qui facture-t-on les frais de gestion ?

Dans ton exemple, avant le décès :

Jean      → possède 33,33 %
Pauline   → possède 33,33 %
Fils      → possède 33,33 %

Mais côté facturation :

Unité de facturation #UF-001
├── concerne : Lot A3
├── membres facturés : Jean, Pauline, Fils
├── période : date début → date décès de Jean
└── règle : frais de gestion répartis entre les 3

Après le décès :

Unité de facturation #UF-002
├── concerne : Lot A3
├── membres facturés : Pauline, Fils
├── période : lendemain décès → ...
└── règle : frais de gestion répartis entre les 2

Même si la situation juridique de la succession n’est pas encore régularisée, la règle de facturation opérationnelle peut changer.

2. Le groupe doit être versionné, pas modifié

Le point crucial : on ne modifie jamais l’ancien groupe.

Mauvais modèle :

GroupePropriétaires_LotA3
├── Jean
├── Pauline
└── Fils

Puis on enlève Jean.

Cela détruit l’historique.

Bon modèle :

GroupePropriétaires_LotA3_v1
├── Jean
├── Pauline
└── Fils
validFrom = 2020-01-01
validTo = 2024-03-15

GroupePropriétaires_LotA3_v2
├── Pauline
└── Fils
validFrom = 2024-03-16
validTo = null
previousVersion = GroupePropriétaires_LotA3_v1
changeReason = décès de Jean

Donc un groupe n’est pas seulement un ensemble de personnes. C’est une composition datée.

3. Modèle recommandé : Groupe + Membership historisé

Tu peux modéliser cela de deux façons.

Option A — Groupe versionné
BillingGroup
├── id
├── lot
├── type : groupe de facturation
├── validFrom
├── validTo
├── status
├── previousGroup
├── changeEvent
└── members

Exemple :

BillingGroup_BG001
├── lot : A3
├── validFrom : 2020-01-01
├── validTo : 2024-03-15
├── membres :
│   ├── Jean
│   ├── Pauline
│   └── Fils
└── règle : frais de gestion divisés par 3

BillingGroup_BG002
├── lot : A3
├── validFrom : 2024-03-16
├── validTo : null
├── previousGroup : BG001
├── changeEvent : décès de Jean
├── membres :
│   ├── Pauline
│   └── Fils
└── règle : frais de gestion divisés par 2

C’est très lisible côté métier.

Option B — Groupe stable + memberships datés
GroupePropriétaires_LotA3
├── Jean : du 2020-01-01 au 2024-03-15
├── Pauline : du 2020-01-01 à ...
└── Fils : du 2020-01-01 à ...

Cette option est élégante, mais pour la facturation elle peut devenir dangereuse, car il faut recalculer la composition à chaque date.

Pour un système de syndic, je recommande plutôt :

Groupe versionné pour la facturation
+
Memberships historisés pour l’explication
4. Pourquoi créer un nouveau groupe à chaque changement ?

Parce que la facture doit pouvoir répondre à la question :

À la date de la prestation, qui était le groupe facturable ?

Exemple :

Frais de gestion du 01/02/2024
→ groupe applicable : BG001
→ Jean, Pauline, Fils

Frais de gestion du 20/04/2024
→ groupe applicable : BG002
→ Pauline, Fils

Si tu modifies simplement les membres d’un groupe unique, tu ne sais plus justifier pourquoi une ancienne facture a été adressée à Jean.

5. Relation entre groupe de propriété et groupe de facturation

Il faut distinguer au minimum deux groupes :

Groupe de titulaires
Groupe de facturation

Ils peuvent être identiques, mais pas toujours.

Exemples :

Groupe de titulaires :
Jean, Pauline, Fils

Groupe de facturation :
Jean seul

Ou :

Groupe de titulaires :
Jean, Pauline, Fils

Groupe de facturation :
Pauline comme contact/payeur principal

Ou dans ton cas :

Groupe de titulaires :
Jean, Pauline, Fils

Groupe de facturation :
Jean, Pauline, Fils

Puis après décès :

Groupe de titulaires juridique :
Jean, Pauline, Fils
statut : à vérifier / succession

Groupe de facturation opérationnel :
Pauline, Fils

Donc la mort peut modifier la facturation opérationnelle avant que la propriété juridique soit complètement régularisée.

6. Modèle canonique proposé

Je créerais ces objets :

Lot
Personne
DroitDePropriété
GroupeDeTitulaires
GroupeDeFacturation
Membership
Événement
Document
RègleDeFacturation
Facture
LigneDeFacture

Les relations :

Personne -- détient --> DroitDePropriété
DroitDePropriété -- porte sur --> Lot
Personne -- membre de --> GroupeDeTitulaires
Personne -- membre de --> GroupeDeFacturation
GroupeDeFacturation -- applicable à --> Lot
GroupeDeFacturation -- utilise --> RègleDeFacturation
Événement -- clôture --> GroupeDeFacturation
Événement -- crée --> GroupeDeFacturation
Facture -- facturée à --> GroupeDeFacturation
LigneDeFacture -- calculée selon --> RègleDeFacturation
7. Exemple complet

Avant décès :

Lot A3

DroitPropriété Jean
├── titulaire : Jean
├── lot : A3
├── quote-part : 33,33 %
├── validFrom : 2020-01-01
└── validTo : 2024-03-15 ou à vérifier selon droit successoral

DroitPropriété Pauline
├── titulaire : Pauline
├── lot : A3
├── quote-part : 33,33 %
└── validFrom : 2020-01-01

DroitPropriété Fils
├── titulaire : Fils
├── lot : A3
├── quote-part : 33,33 %
└── validFrom : 2020-01-01

GroupeFacturation BG001
├── lot : A3
├── membres : Jean, Pauline, Fils
├── validFrom : 2020-01-01
├── validTo : 2024-03-15
├── règle : frais de gestion répartis entre membres actifs
└── source : titre de propriété / fiche propriétaire

Après décès :

Événement EV001
├── type : décès
├── personne : Jean
├── date événement : 2024-03-15
├── document : acte de décès
└── effet métier : changement groupe de facturation

GroupeFacturation BG002
├── lot : A3
├── membres : Pauline, Fils
├── validFrom : 2024-03-16
├── validTo : null
├── previousGroup : BG001
├── createdByEvent : EV001
├── règle : frais de gestion répartis entre membres actifs
└── statut : actif
8. Les frais passés restent liés à l’ancien groupe

Chaque facture ou ligne de facture doit pointer vers le groupe applicable au moment du fait générateur.

LigneFraisGestion #L001
├── période : 2024-02-01 → 2024-02-29
├── lot : A3
├── groupe facturé : BG001
├── membres : Jean, Pauline, Fils
└── montant réparti sur 3

Après décès :

LigneFraisGestion #L002
├── période : 2024-04-01 → 2024-04-30
├── lot : A3
├── groupe facturé : BG002
├── membres : Pauline, Fils
└── montant réparti sur 2

C’est cette liaison qui garantit l’auditabilité.

9. Attention aux dates : date d’événement vs date d’effet

Il faut absolument distinguer :

date de l’événement
date de connaissance par le syndic
date d’effet juridique
date d’effet de facturation
date de traitement système

Exemple :

Jean meurt le 15/03
Le syndic l’apprend le 10/04
L’acte de décès est reçu le 20/04
Le système encode le 21/04
L’effet de facturation est rétroactif au 16/03

Donc ton événement doit contenir :

eventDate = 2024-03-15
knownDate = 2024-04-10
evidenceDate = 2024-04-20
recordedDate = 2024-04-21
billingEffectiveDate = 2024-03-16

Cela permet de recalculer ou corriger correctement les factures.

10. Statuts du groupe de facturation

Je proposerais :

Groupe de facturation
├── brouillon
├── actif
├── clôturé
├── remplacé
├── contesté
├── suspendu
└── archivé

Et pour chaque membre :

Membership
├── actif
├── terminé
├── suspendu
├── contesté
└── à vérifier
11. Règles métier importantes
Règle 1
Une facture passée ne doit jamais être recalculée contre un groupe modifié.
Elle doit rester liée à la version du groupe utilisée au moment de l’émission.
Règle 2
Tout changement de composition crée une nouvelle version du groupe de facturation.
Règle 3
La date d’effet de facturation peut être différente de la date d’encodage.
Règle 4
Un décès, divorce ou changement de propriétaire ne supprime pas l’historique.
Il clôture certaines relations et en ouvre de nouvelles.
Règle 5
Le groupe de facturation est une unité comptable/opérationnelle.
Le groupe de titulaires est une unité patrimoniale/juridique.
Ils peuvent diverger.
12. Modèle de données conseillé
{
  "id": "billing_group_bg001",
  "type": "BillingGroup",
  "lot": "lot_a3",
  "validFrom": "2020-01-01",
  "validTo": "2024-03-15",
  "status": "closed",
  "members": [
    {
      "person": "jean",
      "share": "1/3",
      "role": "co-billed-owner",
      "validFrom": "2020-01-01",
      "validTo": "2024-03-15"
    },
    {
      "person": "pauline",
      "share": "1/3",
      "role": "co-billed-owner",
      "validFrom": "2020-01-01",
      "validTo": null
    },
    {
      "person": "fils",
      "share": "1/3",
      "role": "co-billed-owner",
      "validFrom": "2020-01-01",
      "validTo": null
    }
  ],
  "billingRule": {
    "type": "split_by_members",
    "basis": "equal_split",
    "countMembers": 3
  },
  "evidence": [
    "titre_propriete_001"
  ]
}

Puis :

{
  "id": "billing_group_bg002",
  "type": "BillingGroup",
  "lot": "lot_a3",
  "validFrom": "2024-03-16",
  "validTo": null,
  "status": "active",
  "previousGroup": "billing_group_bg001",
  "createdByEvent": "death_event_jean",
  "members": [
    {
      "person": "pauline",
      "share": "1/2",
      "role": "co-billed-owner",
      "validFrom": "2024-03-16",
      "validTo": null
    },
    {
      "person": "fils",
      "share": "1/2",
      "role": "co-billed-owner",
      "validFrom": "2024-03-16",
      "validTo": null
    }
  ],
  "billingRule": {
    "type": "split_by_members",
    "basis": "equal_split",
    "countMembers": 2
  },
  "evidence": [
    "acte_de_deces_jean"
  ]
}
13. Point subtil : quote-part juridique ≠ quote-part de facturation

Dans ton exemple tu dis :

Jean, Pauline et leur fils sont propriétaires d’un appart à 33 %
Les frais de gestion, à part de leur quotité, sont facturés aux 3.

Donc il faut deux quotes-parts différentes :

quotePartPropriété = 33,33 %
quotePartFacturation = 33,33 %

Mais dans d’autres cas :

Jean possède 50 %
Pauline possède 50 %
mais Jean paie 100 %

Donc ne pas réutiliser automatiquement la quote-part de propriété pour la facturation.

Il faut plutôt :

DroitDePropriété.share
GroupeFacturation.billingShare
14. Quand Jean meurt : que devient sa part ?

D’un point de vue système de gestion, il y a plusieurs options métier.

Option opérationnelle simple
À partir du décès, Jean est exclu du groupe de facturation.
Les frais futurs sont répartis entre les membres restants.

C’est ce que tu décris.

Option juridiquement prudente
Jean est remplacé par “Succession de Jean”.
Le groupe devient :
Pauline
Fils
Succession Jean

Cela peut être nécessaire si la succession reste redevable.

Option mixte
Créer un dossier Succession Jean
mais facturer opérationnellement Pauline + Fils

Je recommande de permettre les trois cas via une règle de facturation paramétrable.

15. Donc la règle finale devient
Créer un groupe quand :
1. le collectif sert d’unité de facturation ;
2. le collectif sert d’unité de responsabilité ;
3. le collectif sert d’unité de représentation ;
4. le collectif doit être historisé ;
5. une facture, décision ou communication doit pouvoir pointer vers lui.

Et :

Toute modification de composition, de règle de répartition ou de responsabilité crée une nouvelle version du groupe.
16. Formulation ontologique simple

Tu peux nommer cela :

TemporalizedGroup
BillingGroup
OwnershipGroup
GroupMembership
GroupVersion
BillingResponsibility

Avec le patron :

GroupIdentity
  └── GroupVersion v1
        ├── members
        ├── validFrom
        ├── validTo
        └── rule

GroupIdentity
  └── GroupVersion v2
        ├── members
        ├── validFrom
        ├── validTo
        ├── previousVersion
        └── changeEvent

La GroupIdentity peut rester stable :

Groupe facturation Lot A3

Mais les versions changent :

Version 1 : Jean + Pauline + Fils
Version 2 : Pauline + Fils

C’est probablement le meilleur compromis.

Conclusion

Tu dois bien créer des groupes, mais pas comme simples collections modifiables.

Pour une agence de syndic, un groupe doit être :

une entité métier versionnée,
avec une période de validité,
une composition,
une règle de facturation,
des documents/preuves,
et un lien vers l’événement qui a causé le changement.

Donc dans ton exemple :

BG001 : Jean + Pauline + Fils
valide jusqu’au décès de Jean
utilisé pour toutes les factures passées

BG002 : Pauline + Fils
valide après le décès de Jean
utilisé pour les nouvelles factures

C’est la bonne approche pour préserver l’historique, expliquer les factures et éviter les erreurs lors de décès, divorce, succession ou changement de propriétaire.

n'oublie pas que tu réfléchis en mode graphe et pas en mode db


Oui, correction importante : il faut raisonner graphe sémantique, pas “tables de DB”. Donc on ne pense pas d’abord en objets CRUD (BillingGroup, members[], etc.), mais en nœuds, arêtes, arêtes réifiées, temporalité et provenance.

La bonne formulation graphe serait plutôt :

Jean ──[membreDe, validité 2020-01-01 → 2024-03-15]──► GroupeFacturable_v1
Pauline ──[membreDe, validité 2020-01-01 → 2024-03-15]──► GroupeFacturable_v1
Fils ──[membreDe, validité 2020-01-01 → 2024-03-15]──► GroupeFacturable_v1

GroupeFacturable_v1 ──[facturablePour]──► Lot A3
GroupeFacturable_v1 ──[remplacéPar, cause = décès Jean]──► GroupeFacturable_v2

Pauline ──[membreDe, validité 2024-03-16 → ∞]──► GroupeFacturable_v2
Fils ──[membreDe, validité 2024-03-16 → ∞]──► GroupeFacturable_v2

GroupeFacturable_v2 ──[facturablePour]──► Lot A3

Mais pour rester propre en graphe, les relations importantes deviennent elles-mêmes des nœuds-relation.

1. Patron graphe correct

Au lieu de stocker un groupe comme une liste, on crée des nœuds de relation :

Jean ──► Membership_001 ──► GroupeFacturable_v1
Pauline ──► Membership_002 ──► GroupeFacturable_v1
Fils ──► Membership_003 ──► GroupeFacturable_v1

Chaque Membership porte :

type = appartenance facturable
dateDébut
dateFin
quotePartFacturation
statut
preuve
causeDébut
causeFin

Donc :

Membership_001
├── membre : Jean
├── groupe : GroupeFacturable_v1
├── rôle : co-redevable
├── quotePartFacturation : 1/3
├── validFrom : 2020-01-01
├── validTo : 2024-03-15
├── endedBy : Décès_Jean
└── confirmedBy : TitrePropriété_001

Et après décès :

Membership_004
├── membre : Pauline
├── groupe : GroupeFacturable_v2
├── rôle : co-redevable
├── quotePartFacturation : 1/2
├── validFrom : 2024-03-16
└── createdBy : Décès_Jean
2. Le groupe n’est pas une “ligne”, c’est un nœud d’état temporel

En mode graphe, je distinguerais :

GroupeConceptuel
GroupeVersion
Membership
Événement
Preuve
Règle

Exemple :

GroupeFacturable_LotA3
    ├── aVersion → GroupeFacturable_LotA3_v1
    └── aVersion → GroupeFacturable_LotA3_v2

GroupeFacturable_LotA3_v1
    ├── validFrom → 2020-01-01
    ├── validTo → 2024-03-15
    ├── applicableÀ → LotA3
    ├── utiliseRègle → RépartitionParMembres_v1
    └── remplacéPar → GroupeFacturable_LotA3_v2

Le nœud GroupeFacturable_LotA3 représente l’identité stable du groupe.
Les nœuds v1, v2, v3 représentent ses états successifs.

3. Les factures pointent vers le nœud temporel, pas vers le groupe abstrait

C’est ça le point crucial :

Facture_Février_2024 ──facturéeÀ──► GroupeFacturable_LotA3_v1
Facture_Avril_2024 ──facturéeÀ──► GroupeFacturable_LotA3_v2

Ainsi, même si le groupe évolue, les anciennes factures restent attachées au bon état du graphe.

Facture_Février_2024
 ├── concerne → LotA3
 ├── période → 2024-02
 ├── facturéeÀ → GroupeFacturable_LotA3_v1
 └── calculéeSelon → RépartitionParMembres_v1
4. Le décès est un nœud événement, pas une mutation directe

En graphe :

Décès_Jean
 ├── concerne → Jean
 ├── documentéPar → ActeDécès_Jean
 ├── clôture → Membership_001
 ├── clôture → GroupeFacturable_LotA3_v1
 ├── crée → GroupeFacturable_LotA3_v2
 └── déclenche → DossierSuccession_Jean

Donc le décès n’efface rien. Il ajoute des nœuds et des arêtes :

Jean ──ancienMembreDe──► GroupeFacturable_v1
DécèsJean ──clôture──► Membership_Jean_v1
DécèsJean ──crée──► GroupeFacturable_v2
5. Ne pas confondre les graphes

Pour ton domaine, je distinguerais plusieurs sous-graphes superposés :

Graphe patrimonial
Personne → Droit réel → Lot

Graphe de facturation
Personne → Membership facturable → Groupe facturable → Lot

Graphe événementiel
Événement → impacte/clôture/crée → relations ou groupes

Graphe documentaire
Document → confirme/documente/prouve → nœuds, relations, événements

Graphe de communication
Message → envoyéPar/reçuPar/concerne → personne, groupe, lot, dossier

Le même Jean peut être dans plusieurs graphes :

Jean ──titulaireDe──► DroitPropriété_Jean_LotA3
Jean ──membreDe──► GroupeFacturable_v1
Jean ──destinataireDe──► Communication_123
Jean ──concernéPar──► Décès_Jean
6. Exemple en RDF/Turtle simplifié
:Jean a :Personne .
:Pauline a :Personne .
:Fils a :Personne .
:LotA3 a :Lot .

:GroupeFacturableLotA3 a :GroupeConceptuel ;
  :concerneLot :LotA3 ;
  :aVersion :GroupeFacturableLotA3_v1, :GroupeFacturableLotA3_v2 .

:GroupeFacturableLotA3_v1 a :GroupeVersion ;
  :versionDe :GroupeFacturableLotA3 ;
  :validFrom "2020-01-01" ;
  :validTo "2024-03-15" ;
  :remplacéPar :GroupeFacturableLotA3_v2 .

:MembershipJean_v1 a :Membership ;
  :membre :Jean ;
  :groupe :GroupeFacturableLotA3_v1 ;
  :role :CoRedevable ;
  :quotePartFacturation "1/3" ;
  :validFrom "2020-01-01" ;
  :validTo "2024-03-15" ;
  :endedBy :DecesJean .

:MembershipPauline_v1 a :Membership ;
  :membre :Pauline ;
  :groupe :GroupeFacturableLotA3_v1 ;
  :role :CoRedevable ;
  :quotePartFacturation "1/3" .

:MembershipFils_v1 a :Membership ;
  :membre :Fils ;
  :groupe :GroupeFacturableLotA3_v1 ;
  :role :CoRedevable ;
  :quotePartFacturation "1/3" .

:DecesJean a :EvenementEtatCivil ;
  :typeEvenement :Deces ;
  :concerne :Jean ;
  :documentéPar :ActeDecesJean ;
  :cloture :GroupeFacturableLotA3_v1, :MembershipJean_v1 ;
  :crée :GroupeFacturableLotA3_v2 .

:GroupeFacturableLotA3_v2 a :GroupeVersion ;
  :versionDe :GroupeFacturableLotA3 ;
  :validFrom "2024-03-16" ;
  :createdBy :DecesJean .

:MembershipPauline_v2 a :Membership ;
  :membre :Pauline ;
  :groupe :GroupeFacturableLotA3_v2 ;
  :role :CoRedevable ;
  :quotePartFacturation "1/2" .

:MembershipFils_v2 a :Membership ;
  :membre :Fils ;
  :groupe :GroupeFacturableLotA3_v2 ;
  :role :CoRedevable ;
  :quotePartFacturation "1/2" .

:FactureFevrier2024 a :Facture ;
  :concerne :LotA3 ;
  :facturéeÀ :GroupeFacturableLotA3_v1 ;
  :calculéeSelon :RegleRepartitionMembres_v1 .

:FactureAvril2024 a :Facture ;
  :concerne :LotA3 ;
  :facturéeÀ :GroupeFacturableLotA3_v2 ;
  :calculéeSelon :RegleRepartitionMembres_v2 .
7. Règle graphe finale

La règle n’est donc pas “mettre à jour un groupe”.

La règle est :

Un changement de composition ajoute un nouvel état au graphe.
Il ne modifie jamais l’ancien état.

Donc :

GroupeFacturable_v1 --remplacéPar--> GroupeFacturable_v2
Événement --clôture--> anciennes relations
Événement --crée--> nouvelles relations
Facture --pointeVers--> version applicable du groupe
Document --prouve--> événement, relation ou groupe

La taxonomie doit donc prévoir non seulement des types de nœuds, mais aussi des types d’arêtes réifiées :

Membership
DroitPropriété
DroitOccupation
Mandat
ResponsabilitéFacturation
Validation
PreuveDocumentaire
ImpactÉvénementiel
SuccessionDeVersion

C’est ça qui garde le modèle vraiment graphe : les verbes importants deviennent des nœuds/arêtes qualifiées, et l’historique se construit par ajout de nouveaux chemins, jamais par écrasement.

dans les relations précédente -> propriétaire  Jean -> POSSEDE -> LOT
on associe des paramètres dont la fameuse date de fin
et un champ note de fin/cause de fin ? décès/divorce etc


Oui. Dans ton modèle graphe, l’arête qualifiée :

Jean ── POSSEDE ──► Lot A3

doit porter au minimum une période de validité et une cause de fin.

Mais je ferais attention à un point : la dateFin de la relation et la causeFin ne sont pas toujours de même nature. Par exemple, un décès peut mettre fin à la relation de facturation, mais ne met pas toujours immédiatement fin à la relation juridique de propriété tant que la succession n’est pas formalisée.

Donc je distinguerais :

dateFinRelation
causeFinRelation
dateEffetFacturation
causeEffetFacturation
statutRelation
1. Arête simple enrichie

Pour une relation patrimoniale :

Jean ── POSSEDE ──► Lot A3

l’arête peut avoir :

typeRelation : POSSEDE
typeDroit : pleine propriété
quotePart : 1/3
validFrom : 2020-01-01
validTo : 2024-03-15
status : clôturé
endReason : décès
endEvent : DécèsJean
endNote : "Décès du copropriétaire Jean ; facturation transférée au groupe restant."
confirmedBy : TitrePropriété001
endedByDocument : ActeDécèsJean
replacedBy : RelationPropriétéSuccessionOuHéritiers

Donc oui, un champ causeFin ou endReason est nécessaire.

2. Mais il faut éviter un seul champ texte libre

Je ne mettrais pas seulement :

noteFin = "décès"

Je ferais plutôt :

endReasonCode : DEATH
endReasonLabel : Décès
endEvent : Event_Death_Jean
endNote : texte libre complémentaire

Pourquoi ? Parce que le système devra filtrer, automatiser, rechercher, auditer.

Exemple :

endReasonCode = DEATH

permet de déclencher automatiquement :

ouvrir dossier succession
vérifier héritiers
clôturer groupe de facturation v1
créer groupe de facturation v2
demander acte de décès
mettre relation en statut à vérifier

Alors que :

noteFin = "Jean est décédé"

est lisible mais peu exploitable.

3. Taxonomie des causes de fin

Je créerais une taxonomie contrôlée :

Cause de fin de relation
├── Décès
├── Divorce
├── Séparation
├── Vente
├── Donation
├── Succession clôturée
├── Mutation propriétaire
├── Fin de bail
├── Résiliation de mandat
├── Révocation de mandat
├── Expiration contractuelle
├── Décision judiciaire
├── Décision AG
├── Erreur de données
├── Fusion de lots
├── Division de lot
├── Changement de représentant
├── Changement de payeur
└── Autre

Mais attention : cette taxonomie doit être spécifique au type de relation.

4. Causes de fin par type de relation
Relation POSSEDE
POSSEDE
├── Vente
├── Donation
├── Succession / mutation successorale
├── Décision judiciaire
├── Partage après divorce
├── Expropriation
├── Correction d’erreur
├── Fusion / division de lot
└── Fin de personnalité juridique, pour société dissoute

Ici, un décès seul peut être une cause de mise en vérification, mais pas toujours la cause juridique finale de fin de propriété.

Donc :

Jean POSSEDE Lot
status = à vérifier
reason = décès

Puis plus tard :

Jean POSSEDE Lot
status = clôturé
endReason = mutation successorale
endDocument = acte de succession / acte notarié
Relation EST_FACTURÉ_POUR ou MEMBRE_DU_GROUPE_FACTURABLE
MEMBRE_DU_GROUPE_FACTURABLE
├── Décès
├── Vente
├── Divorce
├── Changement de payeur
├── Changement de mandataire
├── Correction administrative
├── Décision interne
└── Demande du propriétaire

Ici, le décès peut très bien être une cause directe de fin.

Exemple :

Jean ── MEMBRE_FACTURABLE_DE ──► GroupeFacturable_v1
validTo = 2024-03-15
endReason = décès
endEvent = DécèsJean
Relation OCCUPE
OCCUPE
├── Déménagement
├── Fin de bail
├── Décès
├── Séparation
├── Expulsion
├── Vente
├── Changement de locataire
└── Correction d’erreur
Relation REPRÉSENTE
REPRÉSENTE
├── Fin de mandat
├── Révocation
├── Décès du mandant
├── Décès du mandataire
├── Expiration
├── Divorce / séparation
├── Décision judiciaire
└── Remplacement du mandataire
5. Meilleur patron graphe : arête réifiée

Si ton système permet des attributs sur les arêtes, tu peux les mettre directement sur l’arête. Mais dès que tu as beaucoup d’historique, preuves, événements, documents, je préfère réifier :

Jean ── titulaireDe ──► RelationPropriété_001 ── porteSur ──► Lot A3

Et RelationPropriété_001 porte :

relationType : POSSEDE
typeDroit : pleine propriété
quotePart : 1/3
validFrom : 2020-01-01
validTo : 2024-03-15
status : clôturé
endReason : décès
endEvent : DécèsJean
endNote : "Fin de la responsabilité de facturation à compter du décès."
confirmedBy : TitrePropriété001
closedBy : ActeDécèsJean

Ce modèle permet de relier plusieurs documents :

TitrePropriété001 ── confirme ──► RelationPropriété_001
ActeDécèsJean ── clôtureOuImpacte ──► RelationPropriété_001
EmailNotaire123 ── signale ──► DécèsJean
6. Point critique : fin juridique vs fin opérationnelle

Je conseille de ne pas avoir une seule dateFin.

Pour les relations patrimoniales, je mettrais :

validFrom
validTo
legalEffectiveFrom
legalEffectiveTo
operationalEffectiveFrom
operationalEffectiveTo
billingEffectiveFrom
billingEffectiveTo
recordedAt

Exemple Jean :

RelationPropriété_Jean_LotA3
├── legalEffectiveFrom : 2020-01-01
├── legalEffectiveTo : null / à déterminer
├── billingEffectiveTo : 2024-03-15
├── status : succession_en_cours
├── statusReason : décès
└── impactedBy : DécèsJean

Puis quand l’acte de succession arrive :

RelationPropriété_Jean_LotA3
├── legalEffectiveTo : 2024-03-15 ou autre date selon acte
├── status : clôturé
├── endReason : mutation successorale
└── closedBy : ActeSuccession001

Cela évite une erreur fréquente : considérer que le décès clôture immédiatement tous les droits.

7. Structure recommandée pour les attributs d’une relation
Relation
├── identity
│   ├── id
│   ├── type
│   └── label
├── endpoints
│   ├── from
│   └── to
├── qualification
│   ├── role
│   ├── typeDroit
│   ├── quotePart
│   └── périmètre
├── temporalité
│   ├── validFrom
│   ├── validTo
│   ├── effectiveFrom
│   ├── effectiveTo
│   └── recordedAt
├── statut
│   ├── status
│   ├── statusReason
│   └── confidence
├── fin
│   ├── endReasonCode
│   ├── endEvent
│   ├── endDocument
│   ├── endNote
│   └── replacedBy
└── preuve
    ├── createdByDocument
    ├── confirmedByDocument
    ├── modifiedByEvent
    └── closedByDocument
8. Exemple précis avec Jean
Avant décès
Jean ── POSSEDE ──► Lot A3

Arête POSSEDE
├── typeDroit : pleine propriété
├── quotePart : 1/3
├── validFrom : 2020-01-01
├── validTo : null
├── status : confirmé
├── confirmedBy : TitrePropriété001
└── confidence : élevé
Décès signalé
DécèsJean
├── type : décès
├── concerne : Jean
├── eventDate : 2024-03-15
├── knownDate : 2024-04-10
├── documentéPar : ActeDécèsJean
└── impacte : RelationPropriété_Jean_LotA3

La relation peut devenir :

Jean ── POSSEDE ──► Lot A3

Arête POSSEDE
├── status : succession_en_cours
├── statusReason : décès
├── impactedBy : DécèsJean
├── billingEffectiveTo : 2024-03-15
└── legalEffectiveTo : null
Succession régularisée
Jean ── POSSEDE ──► Lot A3

Arête POSSEDE
├── validTo : 2024-03-15
├── status : clôturé
├── endReasonCode : SUCCESSION_TRANSFER
├── endReasonLabel : mutation successorale
├── endEvent : SuccessionCloturee001
├── endDocument : ActeSuccession001
├── replacedBy : RelationPropriétéPauline_LotA3_v2
└── endNote : "Part transférée selon acte de succession reçu le ..."
9. Pour la facturation, la fin est plus directe
Jean ── MEMBRE_DE ──► GroupeFacturable_v1

Arête MEMBRE_DE
├── role : co-redevable
├── quotePartFacturation : 1/3
├── validFrom : 2020-01-01
├── validTo : 2024-03-15
├── endReasonCode : DEATH
├── endEvent : DécèsJean
├── endedByDocument : ActeDécèsJean
└── replacedBy : GroupeFacturable_v2

Ici, dateFin est claire : la responsabilité de facturation opérationnelle de Jean s’arrête à la date définie par la règle métier.

Conclusion

Oui, chaque relation importante doit pouvoir porter :

date de début
date de fin
cause de fin
note de fin
événement de fin
document de fin
relation remplaçante
statut
preuve

Mais je recommande fortement de distinguer :

causeFin structurée = décès / divorce / vente / succession / erreur / etc.
noteFin = commentaire humain
endEvent = nœud événement lié
endDocument = document justificatif

Et surtout :

dateFin juridique ≠ dateFin facturation ≠ dateFin opérationnelle

Dans ton exemple, le décès de Jean clôture probablement immédiatement son membership dans le groupe facturable, mais la relation POSSEDE peut passer par un état intermédiaire :

confirmé → succession en cours → clôturé/remplacé


