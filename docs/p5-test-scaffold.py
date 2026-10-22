from pathlib import Path
D=Path(__file__).resolve().parent
for name in ['p4c-core-test.mjs','p4c-security-test.mjs','p4c-integration-test.mjs','p4c-regression-core-test.mjs','p4c-regression-query-contract-test.mjs','p4c-regression-config-test.mjs','p4c-fault-test.mjs','p4c-architecture-test.mjs','p4c-regression-browser-test.mjs']:
 target=D/name.replace('p4c-','p5-');assert not target.exists(),'Refuse overwrite test copy';target.write_text((D/name).read_text(encoding='utf-8').replace('./p4c-http.mjs','./p5-http.mjs').replace('docs/p4c-evidence','docs/p5-evidence'),encoding='utf-8')
print('Copied reviewed regression scripts to P5 evidence scope; no issuance HOLD fault generation included')
