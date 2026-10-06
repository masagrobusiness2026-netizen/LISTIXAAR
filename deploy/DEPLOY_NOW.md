# LISTIXAAR — Déploiement réel

## Architecture choisie pour cette étape
- Application : Render Web Service (Node.js/Express)
- Base : Render PostgreSQL
- Domaine/DNS : Cloudflare ou le registrar du domaine
- HTTPS : certificat automatique Render après validation du domaine

## Ce qu'il faut faire dans les comptes
1. Créer/ouvrir le compte Render.
2. Importer le projet depuis un dépôt Git (GitHub/GitLab) ou utiliser la méthode de déploiement disponible dans Render.
3. Utiliser `render.yaml` pour créer le service et PostgreSQL.
4. Configurer les variables secrètes.
5. Déployer.
6. Exécuter les scripts SQL de `database/` dans l'ordre.
7. Vérifier `/api/health`.
8. Ajouter le domaine dans Render.
9. Configurer le DNS du domaine.
10. Vérifier le domaine et attendre l'émission du certificat HTTPS.

## Paiement
NE PAS configurer le code marchand maintenant.
Les variables de paiement restent vides jusqu'à validation complète du site.

## Important
Un vrai déploiement nécessite l'accès aux comptes Render, au registrar/DNS et au dépôt de code. Je ne peux pas créer ou utiliser ces comptes à ta place depuis le ZIP seul.
