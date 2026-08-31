/**
 * demo-data.ts
 * Single source of truth for all verified legal documents, categories, and relations.
 */
import type { LegalDocument, Category, DocumentCategoryLink, DocumentRelation } from '@/types';

export const DEMO_CATEGORIES: Category[] = [
  {
    "id": "8ae77872-c9c3-4f81-a64e-055aade89fdf",
    "parent_id": "9d224384-b33d-432e-a016-c2f0a2fd8a66",
    "name": "Luật thuế GTGT",
    "slug": "thue-gtgt-luat",
    "description": null,
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:35.150767+00:00"
  },
  {
    "id": "9d224384-b33d-432e-a016-c2f0a2fd8a66",
    "parent_id": "33d0c530-17e1-46bb-adb3-9ff5dbaf55c8",
    "name": "Thuế GTGT",
    "slug": "thue-gtgt",
    "description": "Thuế giá trị gia tăng",
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:34.374681+00:00"
  },
  {
    "id": "8380fdb0-0318-42e6-aba5-263c62922d9a",
    "parent_id": null,
    "name": "Kế toán",
    "slug": "ke-toan",
    "description": "Luật, nghị định, thông tư, chuẩn mực kế toán",
    "order_index": 1,
    "icon": "BookOpen",
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:31.638718+00:00"
  },
  {
    "id": "75e7c6f1-d666-4484-a397-1cf679e022b6",
    "parent_id": "a76249fc-86c7-4472-a5ed-ea606472798e",
    "name": "Luật kiểm toán",
    "slug": "kiem-toan-luat",
    "description": null,
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:33.85132+00:00"
  },
  {
    "id": "33c404b5-bcb9-4a62-a553-53a2dfeca101",
    "parent_id": "63d88c12-2036-41f3-a3e3-0928b141d68d",
    "name": "Bộ luật lao động",
    "slug": "lao-dong-bo-luat",
    "description": null,
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:36.383333+00:00"
  },
  {
    "id": "727e6881-3368-42b0-a4f9-bde6cc1961ba",
    "parent_id": "767ed3c1-ca2e-41dd-a1a2-08dad6e303f6",
    "name": "Luật BHXH",
    "slug": "bhxh-luat",
    "description": null,
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:35.739513+00:00"
  },
  {
    "id": "4d95d45a-498e-41dd-a830-cecf0b0a0ef7",
    "parent_id": "7896aa1d-729c-4a17-ab18-1bb38c09a419",
    "name": "Luật Doanh nghiệp",
    "slug": "doanh-nghiep-luat",
    "description": "Luật Doanh nghiệp và các luật sửa đổi",
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T01:59:53.422449+00:00",
    "updated_at": "2026-08-29T02:08:33.328369+00:00"
  },
  {
    "id": "21509a18-4d0b-4f5f-a205-8d9d3f68da3d",
    "parent_id": "8380fdb0-0318-42e6-aba5-263c62922d9a",
    "name": "Luật kế toán",
    "slug": "ke-toan-luat",
    "description": null,
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:33.030729+00:00"
  },
  {
    "id": "d19c0797-defd-4fc8-a9ef-8480b2d6c4e6",
    "parent_id": "9d224384-b33d-432e-a016-c2f0a2fd8a66",
    "name": "Nghị định thuế GTGT",
    "slug": "thue-gtgt-nghi-dinh",
    "description": null,
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:35.350084+00:00"
  },
  {
    "id": "e84d2704-271b-4b03-a836-25a310aeff6a",
    "parent_id": "767ed3c1-ca2e-41dd-a1a2-08dad6e303f6",
    "name": "Nghị định BHXH",
    "slug": "bhxh-nghi-dinh",
    "description": null,
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:35.868422+00:00"
  },
  {
    "id": "bde54a1f-1be1-4485-af7a-3f96a700c8c5",
    "parent_id": "7896aa1d-729c-4a17-ab18-1bb38c09a419",
    "name": "Nghị định Doanh nghiệp",
    "slug": "doanh-nghiep-nghi-dinh",
    "description": "Nghị định về đăng ký kinh doanh, quản trị",
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T01:59:53.796403+00:00",
    "updated_at": "2026-08-29T02:08:33.741469+00:00"
  },
  {
    "id": "7d1767c7-6c16-4d76-ab20-af1e930c8b8e",
    "parent_id": "8380fdb0-0318-42e6-aba5-263c62922d9a",
    "name": "Nghị định kế toán",
    "slug": "ke-toan-nghi-dinh",
    "description": null,
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:33.171459+00:00"
  },
  {
    "id": "db9d0158-aa14-47d4-a3a6-f6664353ca45",
    "parent_id": "a76249fc-86c7-4472-a5ed-ea606472798e",
    "name": "Nghị định kiểm toán",
    "slug": "kiem-toan-nghi-dinh",
    "description": null,
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:33.987968+00:00"
  },
  {
    "id": "fb501a15-6742-449b-a0eb-34d445aaa745",
    "parent_id": "33d0c530-17e1-46bb-adb3-9ff5dbaf55c8",
    "name": "Thuế TNDN",
    "slug": "thue-tndn",
    "description": "Thuế thu nhập doanh nghiệp",
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:34.500967+00:00"
  },
  {
    "id": "a76249fc-86c7-4472-a5ed-ea606472798e",
    "parent_id": null,
    "name": "Kiểm toán",
    "slug": "kiem-toan",
    "description": "Luật, nghị định, chuẩn mực kiểm toán",
    "order_index": 2,
    "icon": "ClipboardCheck",
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:31.985536+00:00"
  },
  {
    "id": "c575615d-362b-4cb8-ac7f-014b454cd7ce",
    "parent_id": "63d88c12-2036-41f3-a3e3-0928b141d68d",
    "name": "Nghị định lao động",
    "slug": "lao-dong-nghi-dinh",
    "description": null,
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:36.509331+00:00"
  },
  {
    "id": "d803e6e0-3dd2-4ab6-a968-365603ee92df",
    "parent_id": "8380fdb0-0318-42e6-aba5-263c62922d9a",
    "name": "Thông tư kế toán",
    "slug": "ke-toan-thong-tu",
    "description": null,
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:33.387374+00:00"
  },
  {
    "id": "1047f463-14f3-471f-ad15-65f253518597",
    "parent_id": "767ed3c1-ca2e-41dd-a1a2-08dad6e303f6",
    "name": "Thông tư BHXH",
    "slug": "bhxh-thong-tu",
    "description": null,
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:35.998218+00:00"
  },
  {
    "id": "331e58b6-5a2f-480a-a0e8-e8b6b40bb5af",
    "parent_id": "33d0c530-17e1-46bb-adb3-9ff5dbaf55c8",
    "name": "Thuế TNCN",
    "slug": "thue-tncn",
    "description": "Thuế thu nhập cá nhân",
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:34.628513+00:00"
  },
  {
    "id": "652e4340-415b-4edc-a8f6-e1cc094108ea",
    "parent_id": "7896aa1d-729c-4a17-ab18-1bb38c09a419",
    "name": "Thông tư Doanh nghiệp",
    "slug": "doanh-nghiep-thong-tu",
    "description": "Thông tư biểu mẫu, thủ tục doanh nghiệp",
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T01:59:54.049796+00:00",
    "updated_at": "2026-08-29T02:08:33.868742+00:00"
  },
  {
    "id": "2b0cf088-3380-426d-ab0a-d3c8f326fb6a",
    "parent_id": "63d88c12-2036-41f3-a3e3-0928b141d68d",
    "name": "Thông tư lao động",
    "slug": "lao-dong-thong-tu",
    "description": null,
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:36.637612+00:00"
  },
  {
    "id": "1c60fbd1-4aed-4ec2-a27d-bc7fe640c255",
    "parent_id": "9d224384-b33d-432e-a016-c2f0a2fd8a66",
    "name": "Thông tư thuế GTGT",
    "slug": "thue-gtgt-thong-tu",
    "description": null,
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:35.474167+00:00"
  },
  {
    "id": "73f96f7c-ef99-43b6-ad62-90196546e3a7",
    "parent_id": "a76249fc-86c7-4472-a5ed-ea606472798e",
    "name": "Chuẩn mực kiểm toán (VSA)",
    "slug": "kiem-toan-chuan-muc",
    "description": null,
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:34.122423+00:00"
  },
  {
    "id": "33d0c530-17e1-46bb-adb3-9ff5dbaf55c8",
    "parent_id": null,
    "name": "Thuế",
    "slug": "thue",
    "description": "Các sắc thuế và văn bản hướng dẫn",
    "order_index": 3,
    "icon": "Calculator",
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:32.194043+00:00"
  },
  {
    "id": "9714ec18-4716-4716-ae8b-0e9e0b6b775d",
    "parent_id": "8380fdb0-0318-42e6-aba5-263c62922d9a",
    "name": "Chuẩn mực kế toán (VAS)",
    "slug": "ke-toan-chuan-muc",
    "description": null,
    "order_index": 4,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:33.517891+00:00"
  },
  {
    "id": "767ed3c1-ca2e-41dd-a1a2-08dad6e303f6",
    "parent_id": null,
    "name": "Bảo hiểm xã hội",
    "slug": "bao-hiem-xa-hoi",
    "description": "Luật BHXH, BHYT, BHTN và văn bản hướng dẫn",
    "order_index": 4,
    "icon": "Shield",
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:32.404614+00:00"
  },
  {
    "id": "21ee2bfd-ead9-4a8f-a4b1-b4d08fd93f58",
    "parent_id": "a76249fc-86c7-4472-a5ed-ea606472798e",
    "name": "Hướng dẫn nghiệp vụ",
    "slug": "kiem-toan-huong-dan",
    "description": null,
    "order_index": 4,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:34.24531+00:00"
  },
  {
    "id": "dd67525a-0adc-427b-ac98-000822b40aa0",
    "parent_id": "33d0c530-17e1-46bb-adb3-9ff5dbaf55c8",
    "name": "Hóa đơn, chứng từ",
    "slug": "hoa-don-chung-tu",
    "description": null,
    "order_index": 4,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:34.760478+00:00"
  },
  {
    "id": "ea022de4-7597-4261-aec6-7ab5ff9131d9",
    "parent_id": "9d224384-b33d-432e-a016-c2f0a2fd8a66",
    "name": "Công văn thuế GTGT",
    "slug": "thue-gtgt-cong-van",
    "description": null,
    "order_index": 4,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:35.607573+00:00"
  },
  {
    "id": "debd32fa-10ac-43c0-a2cc-d3c54a1e78bb",
    "parent_id": "767ed3c1-ca2e-41dd-a1a2-08dad6e303f6",
    "name": "Quyết định BHXH",
    "slug": "bhxh-quyet-dinh",
    "description": null,
    "order_index": 4,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:36.120638+00:00"
  },
  {
    "id": "bd0928ee-1e7f-4a11-a6fd-9cf4372137a3",
    "parent_id": "7896aa1d-729c-4a17-ab18-1bb38c09a419",
    "name": "Giao dịch liên kết",
    "slug": "giao-dich-lien-ket-dn",
    "description": "Quản lý quan hệ liên kết và giá chuyển nhượng",
    "order_index": 4,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T01:59:54.208145+00:00",
    "updated_at": "2026-08-29T02:08:34.101312+00:00"
  },
  {
    "id": "4c29d656-e19f-4c93-a0ee-61bcfc479b35",
    "parent_id": "767ed3c1-ca2e-41dd-a1a2-08dad6e303f6",
    "name": "Công văn BHXH",
    "slug": "bhxh-cong-van",
    "description": null,
    "order_index": 5,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:36.254488+00:00"
  },
  {
    "id": "f3af6f47-f74a-49fc-ac3d-da17aefe6a1e",
    "parent_id": "33d0c530-17e1-46bb-adb3-9ff5dbaf55c8",
    "name": "Quản lý thuế",
    "slug": "quan-ly-thue",
    "description": null,
    "order_index": 5,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:34.890557+00:00"
  },
  {
    "id": "c943ebcd-f8cf-4224-a95c-9217ffe57f89",
    "parent_id": "8380fdb0-0318-42e6-aba5-263c62922d9a",
    "name": "Công văn hướng dẫn",
    "slug": "ke-toan-cong-van",
    "description": null,
    "order_index": 5,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:33.720427+00:00"
  },
  {
    "id": "63d88c12-2036-41f3-a3e3-0928b141d68d",
    "parent_id": null,
    "name": "Lao động và tiền lương",
    "slug": "lao-dong-tien-luong",
    "description": "Bộ luật lao động, lương tối thiểu, HĐLĐ",
    "order_index": 5,
    "icon": "Users",
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:32.607214+00:00"
  },
  {
    "id": "8c4d94ce-bcea-4bdc-a44c-31efb6f7ed6c",
    "parent_id": "a76249fc-86c7-4472-a5ed-ea606472798e",
    "name": "Xử phạt vi phạm kiểm toán",
    "slug": "kiem-toan-xu-phat",
    "description": "Quy định xử phạt trong kiểm toán độc lập",
    "order_index": 5,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T01:59:54.547805+00:00",
    "updated_at": "2026-08-29T02:08:34.444229+00:00"
  },
  {
    "id": "8772abe3-7331-4804-a0e6-9f1ed9809dc3",
    "parent_id": "33d0c530-17e1-46bb-adb3-9ff5dbaf55c8",
    "name": "Thuế nhà thầu",
    "slug": "thue-nha-thau",
    "description": null,
    "order_index": 6,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:35.01588+00:00"
  },
  {
    "id": "02b479f8-aea9-49b4-a81b-aa3397a992b9",
    "parent_id": "8380fdb0-0318-42e6-aba5-263c62922d9a",
    "name": "Kế toán HCSN & Quỹ",
    "slug": "ke-toan-hcsn-quy",
    "description": "Chế độ kế toán hành chính sự nghiệp và quỹ",
    "order_index": 6,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T01:59:54.377365+00:00",
    "updated_at": "2026-08-29T02:08:34.243823+00:00"
  },
  {
    "id": "7896aa1d-729c-4a17-ab18-1bb38c09a419",
    "parent_id": null,
    "name": "Doanh nghiệp",
    "slug": "doanh-nghiep",
    "description": "Luật Doanh nghiệp, thành lập, giải thể",
    "order_index": 6,
    "icon": "Building2",
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:32.744637+00:00"
  },
  {
    "id": "19ac7b29-4e88-44f9-a131-e440cf372516",
    "parent_id": "33d0c530-17e1-46bb-adb3-9ff5dbaf55c8",
    "name": "Giao dịch liên kết & Chuyển giá",
    "slug": "thue-giao-dich-lien-ket",
    "description": "Quản lý thuế đối với doanh nghiệp có giao dịch liên kết",
    "order_index": 7,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T01:59:54.678879+00:00",
    "updated_at": "2026-08-29T02:08:34.604117+00:00"
  },
  {
    "id": "51fa9dc9-d6a7-42e5-a8a4-5ae3ca72ed76",
    "parent_id": null,
    "name": "Đầu tư",
    "slug": "dau-tu",
    "description": "Luật Đầu tư, FDI, ưu đãi đầu tư",
    "order_index": 7,
    "icon": "TrendingUp",
    "is_active": true,
    "created_at": "2026-08-28T08:59:45.736489+00:00",
    "updated_at": "2026-08-28T09:05:32.895997+00:00"
  },
  {
    "id": "c7e2b101-9f12-4c22-92ab-110000000001",
    "parent_id": "fb501a15-6742-449b-a0eb-34d445aaa745",
    "name": "Luật thuế TNDN",
    "slug": "thue-tndn-luat",
    "description": "Luật Thuế thu nhập doanh nghiệp",
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T05:28:50.185Z",
    "updated_at": "2026-08-29T05:28:50.186Z"
  },
  {
    "id": "c7e2b101-9f12-4c22-92ab-110000000002",
    "parent_id": "fb501a15-6742-449b-a0eb-34d445aaa745",
    "name": "Nghị định thuế TNDN",
    "slug": "thue-tndn-nghi-dinh",
    "description": "Nghị định hướng dẫn thuế TNDN",
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T05:28:50.186Z",
    "updated_at": "2026-08-29T05:28:50.186Z"
  },
  {
    "id": "c7e2b101-9f12-4c22-92ab-110000000003",
    "parent_id": "fb501a15-6742-449b-a0eb-34d445aaa745",
    "name": "Thông tư thuế TNDN",
    "slug": "thue-tndn-thong-tu",
    "description": "Thông tư hướng dẫn thuế TNDN",
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T05:28:50.186Z",
    "updated_at": "2026-08-29T05:28:50.186Z"
  },
  {
    "id": "c7e2b101-9f12-4c22-92ab-110000000004",
    "parent_id": "fb501a15-6742-449b-a0eb-34d445aaa745",
    "name": "Công văn thuế TNDN",
    "slug": "thue-tndn-cong-van",
    "description": "Công văn giải đáp vướng mắc thuế TNDN",
    "order_index": 4,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T05:28:50.186Z",
    "updated_at": "2026-08-29T05:28:50.186Z"
  },
  {
    "id": "d8f3c202-0e23-4d33-a3bc-220000000001",
    "parent_id": "331e58b6-5a2f-480a-a0e8-e8b6b40bb5af",
    "name": "Luật thuế TNCN",
    "slug": "thue-tncn-luat",
    "description": "Luật Thuế thu nhập cá nhân",
    "order_index": 1,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T05:28:50.186Z",
    "updated_at": "2026-08-29T05:28:50.186Z"
  },
  {
    "id": "d8f3c202-0e23-4d33-a3bc-220000000002",
    "parent_id": "331e58b6-5a2f-480a-a0e8-e8b6b40bb5af",
    "name": "Nghị định thuế TNCN",
    "slug": "thue-tncn-nghi-dinh",
    "description": "Nghị định hướng dẫn thuế TNCN",
    "order_index": 2,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T05:28:50.186Z",
    "updated_at": "2026-08-29T05:28:50.186Z"
  },
  {
    "id": "d8f3c202-0e23-4d33-a3bc-220000000003",
    "parent_id": "331e58b6-5a2f-480a-a0e8-e8b6b40bb5af",
    "name": "Thông tư thuế TNCN",
    "slug": "thue-tncn-thong-tu",
    "description": "Thông tư hướng dẫn thuế TNCN",
    "order_index": 3,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T05:28:50.186Z",
    "updated_at": "2026-08-29T05:28:50.186Z"
  },
  {
    "id": "d8f3c202-0e23-4d33-a3bc-220000000004",
    "parent_id": "331e58b6-5a2f-480a-a0e8-e8b6b40bb5af",
    "name": "Công văn thuế TNCN",
    "slug": "thue-tncn-cong-van",
    "description": "Công văn giải đáp vướng mắc thuế TNCN",
    "order_index": 4,
    "icon": null,
    "is_active": true,
    "created_at": "2026-08-29T05:28:50.186Z",
    "updated_at": "2026-08-29T05:28:50.186Z"
  }
];

export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = [];

export const DEMO_RELATIONS: DocumentRelation[] = [];

export const DEMO_DOCUMENTS: LegalDocument[] = [];

export function getDocumentById(id: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.id === id);
}

export function getDocumentByNumber(docNumber: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.document_number === docNumber);
}

export function getDocumentRelations(documentId: string): any {
  const asSource = DEMO_RELATIONS.filter((r) => r.source_document_id === documentId);
  const asTarget = DEMO_RELATIONS.filter((r) => r.target_document_id === documentId);
  const all = [...asSource, ...asTarget];
  (all as any).as_source = asSource;
  (all as any).as_target = asTarget;
  return all;
}

export function buildCategoryTree(cats: Category[] = DEMO_CATEGORIES): Category[] {
  const map = new Map<string, Category & { children: Category[] }>();
  const roots: (Category & { children: Category[] })[] = [];

  cats.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  cats.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      const parent = map.get(cat.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function getDocumentsForCategoryTree(categoryId: string): LegalDocument[] {
  const targetCategoryIds = new Set<string>([categoryId]);

  let added = true;
  while (added) {
    added = false;
    for (const cat of DEMO_CATEGORIES) {
      if (cat.parent_id && targetCategoryIds.has(cat.parent_id) && !targetCategoryIds.has(cat.id)) {
        targetCategoryIds.add(cat.id);
        added = true;
      }
    }
  }

  const linkedDocIds = new Set<string>();
  for (const link of DEMO_CATEGORY_LINKS) {
    if (targetCategoryIds.has(link.category_id)) {
      linkedDocIds.add(link.document_id);
    }
  }

  return DEMO_DOCUMENTS.filter((doc) => linkedDocIds.has(doc.id));
}

export function getCategoryDocumentCount(categoryId: string): number {
  return getDocumentsForCategoryTree(categoryId).length;
}
