import { verificationService } from '../src/lib/verification/data-service';

console.log('Testing verificationService methods:');
try {
  const docs = verificationService.getDocuments();
  console.log('✅ getDocuments():', docs.length);
  const rels = verificationService.getRelationships();
  console.log('✅ getRelationships():', rels.length);
  const changes = verificationService.getChangesets();
  console.log('✅ getChangesets():', changes.length);
  const logs = verificationService.getAuditLogs();
  console.log('✅ getAuditLogs():', logs.length);
} catch (err) {
  console.error('❌ Error in verificationService:', err);
}
