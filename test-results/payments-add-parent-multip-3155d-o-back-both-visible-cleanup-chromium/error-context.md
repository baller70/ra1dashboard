# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e6]:
        - heading "RA1 Dashboard" [level=1] [ref=e7]
        - navigation [ref=e9]:
          - link "Dashboard" [ref=e10] [cursor=pointer]:
            - /url: /
          - link "Parents" [ref=e11] [cursor=pointer]:
            - /url: /parents
          - link "Payments" [ref=e12] [cursor=pointer]:
            - /url: /payments
          - link "Communication" [ref=e13] [cursor=pointer]:
            - /url: /communication
          - link "Contracts" [ref=e14] [cursor=pointer]:
            - /url: /contracts
          - link "Assessment" [ref=e15] [cursor=pointer]:
            - /url: /assessments
          - link "Settings" [ref=e16] [cursor=pointer]:
            - /url: /settings
    - main [ref=e17]
  - region "Notifications (F8)":
    - list
```