# Product Model

## Marketplace Sides

### Buyers

- browse resources and stores
- claim free downloads
- purchase paid resources
- leave reviews after purchase
- follow stores
- message creators
- report resources or stores

### Creators

- create and manage a store
- upload, price, archive, and publish resources
- manage preview assets and private downloadable files
- view sales, payouts, analytics, and trust status
- enter moderation when trust or content rules require review

### Admin

- review moderation queue items
- resolve or dismiss reports
- approve, reject, archive, publish, or hide marketplace content
- review creator trust signals and moderation history

## Resource Model

A resource can have:

- title
- short description
- full description
- pricing
- thumbnail
- preview assets
- private main download
- category and tags
- moderation status and moderation reason
- review and sales aggregates

## Store Model

A store can have:

- name
- slug
- logo
- banner
- bio
- location
- publication status
- moderation status and moderation reason
- verification state
- owner relationship
- follower count

## Trust And Moderation Model

- creator trust is derived from account age, approvals, rejections, sales, and reports
- low-trust creators can be routed into manual review before publishing
- admin surfaces expose trust score, trust tier, and reasons for queued items
- moderation events are stored to provide a lightweight audit trail
