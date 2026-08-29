-- ============================================================
-- LegalBook - Supabase Seed SQL (Valid RFC-4122 UUID Format)
-- Dữ liệu Danh mục & Cấu hình Storage
-- ============================================================

-- 1. THÊM DANH MỤC PHÁP LUẬT (CATEGORIES)
INSERT INTO public.categories (id, parent_id, name, slug, description, order_index, icon, is_active)
VALUES
  ('8380fdb0-0318-42e6-aba5-263c62922d9a', NULL, 'Kế toán', 'ke-toan', 'Luật, nghị định, thông tư, chuẩn mực kế toán', 1, 'BookOpen', true),
  ('a76249fc-86c7-4472-a5ed-ea606472798e', NULL, 'Kiểm toán', 'kiem-toan', 'Luật, nghị định, chuẩn mực kiểm toán', 2, 'ClipboardCheck', true),
  ('33d0c530-17e1-46bb-adb3-9ff5dbaf55c8', NULL, 'Thuế', 'thue', 'Các sắc thuế và văn bản hướng dẫn', 3, 'Calculator', true),
  ('767ed3c1-ca2e-41dd-a1a2-08dad6e303f6', NULL, 'Bảo hiểm xã hội', 'bao-hiem-xa-hoi', 'Luật BHXH, BHYT, BHTN và văn bản hướng dẫn', 4, 'Shield', true),
  ('63d88c12-2036-41f3-a3e3-0928b141d68d', NULL, 'Lao động và tiền lương', 'lao-dong-tien-luong', 'Bộ luật lao động, lương tối thiểu, HĐLĐ', 5, 'Users', true),
  ('7896aa1d-729c-4a17-ab18-1bb38c09a419', NULL, 'Doanh nghiệp', 'doanh-nghiep', 'Luật Doanh nghiệp, thành lập, giải thể', 6, 'Building2', true),
  ('51fa9dc9-d6a7-42e5-a8a4-5ae3ca72ed76', NULL, 'Đầu tư', 'dau-tu', 'Luật Đầu tư, FDI, ưu đãi đầu tư', 7, 'TrendingUp', true),
  ('21509a18-4d0b-4f5f-a205-8d9d3f68da3d', '8380fdb0-0318-42e6-aba5-263c62922d9a', 'Luật kế toán', 'ke-toan-luat', NULL, 1, NULL, true),
  ('7d1767c7-6c16-4d76-ab20-af1e930c8b8e', '8380fdb0-0318-42e6-aba5-263c62922d9a', 'Nghị định kế toán', 'ke-toan-nghi-dinh', NULL, 2, NULL, true),
  ('d803e6e0-3dd2-4ab6-a968-365603ee92df', '8380fdb0-0318-42e6-aba5-263c62922d9a', 'Thông tư kế toán', 'ke-toan-thong-tu', NULL, 3, NULL, true),
  ('9714ec18-4716-4716-ae8b-0e9e0b6b775d', '8380fdb0-0318-42e6-aba5-263c62922d9a', 'Chuẩn mực kế toán (VAS)', 'ke-toan-chuan-muc', NULL, 4, NULL, true),
  ('c943ebcd-f8cf-4224-a95c-9217ffe57f89', '8380fdb0-0318-42e6-aba5-263c62922d9a', 'Công văn hướng dẫn', 'ke-toan-cong-van', NULL, 5, NULL, true),
  ('75e7c6f1-d666-4484-a397-1cf679e022b6', 'a76249fc-86c7-4472-a5ed-ea606472798e', 'Luật kiểm toán', 'kiem-toan-luat', NULL, 1, NULL, true),
  ('db9d0158-aa14-47d4-a3a6-f6664353ca45', 'a76249fc-86c7-4472-a5ed-ea606472798e', 'Nghị định kiểm toán', 'kiem-toan-nghi-dinh', NULL, 2, NULL, true),
  ('73f96f7c-ef99-43b6-ad62-90196546e3a7', 'a76249fc-86c7-4472-a5ed-ea606472798e', 'Chuẩn mực kiểm toán (VSA)', 'kiem-toan-chuan-muc', NULL, 3, NULL, true),
  ('21ee2bfd-ead9-4a8f-a4b1-b4d08fd93f58', 'a76249fc-86c7-4472-a5ed-ea606472798e', 'Hướng dẫn nghiệp vụ', 'kiem-toan-huong-dan', NULL, 4, NULL, true),
  ('9d224384-b33d-432e-a016-c2f0a2fd8a66', '33d0c530-17e1-46bb-adb3-9ff5dbaf55c8', 'Thuế GTGT', 'thue-gtgt', 'Thuế giá trị gia tăng', 1, NULL, true),
  ('fb501a15-6742-449b-a0eb-34d445aaa745', '33d0c530-17e1-46bb-adb3-9ff5dbaf55c8', 'Thuế TNDN', 'thue-tndn', 'Thuế thu nhập doanh nghiệp', 2, NULL, true),
  ('331e58b6-5a2f-480a-a0e8-e8b6b40bb5af', '33d0c530-17e1-46bb-adb3-9ff5dbaf55c8', 'Thuế TNCN', 'thue-tncn', 'Thuế thu nhập cá nhân', 3, NULL, true),
  ('dd67525a-0adc-427b-ac98-000822b40aa0', '33d0c530-17e1-46bb-adb3-9ff5dbaf55c8', 'Hóa đơn, chứng từ', 'hoa-don-chung-tu', NULL, 4, NULL, true),
  ('f3af6f47-f74a-49fc-ac3d-da17aefe6a1e', '33d0c530-17e1-46bb-adb3-9ff5dbaf55c8', 'Quản lý thuế', 'quan-ly-thue', NULL, 5, NULL, true),
  ('8772abe3-7331-4804-a0e6-9f1ed9809dc3', '33d0c530-17e1-46bb-adb3-9ff5dbaf55c8', 'Thuế nhà thầu', 'thue-nha-thau', NULL, 6, NULL, true),
  ('8ae77872-c9c3-4f81-a64e-055aade89fdf', '9d224384-b33d-432e-a016-c2f0a2fd8a66', 'Luật thuế GTGT', 'thue-gtgt-luat', NULL, 1, NULL, true),
  ('d19c0797-defd-4fc8-a9ef-8480b2d6c4e6', '9d224384-b33d-432e-a016-c2f0a2fd8a66', 'Nghị định thuế GTGT', 'thue-gtgt-nghi-dinh', NULL, 2, NULL, true),
  ('1c60fbd1-4aed-4ec2-a27d-bc7fe640c255', '9d224384-b33d-432e-a016-c2f0a2fd8a66', 'Thông tư thuế GTGT', 'thue-gtgt-thong-tu', NULL, 3, NULL, true),
  ('ea022de4-7597-4261-aec6-7ab5ff9131d9', '9d224384-b33d-432e-a016-c2f0a2fd8a66', 'Công văn thuế GTGT', 'thue-gtgt-cong-van', NULL, 4, NULL, true),
  ('727e6881-3368-42b0-a4f9-bde6cc1961ba', '767ed3c1-ca2e-41dd-a1a2-08dad6e303f6', 'Luật BHXH', 'bhxh-luat', NULL, 1, NULL, true),
  ('e84d2704-271b-4b03-a836-25a310aeff6a', '767ed3c1-ca2e-41dd-a1a2-08dad6e303f6', 'Nghị định BHXH', 'bhxh-nghi-dinh', NULL, 2, NULL, true),
  ('1047f463-14f3-471f-ad15-65f253518597', '767ed3c1-ca2e-41dd-a1a2-08dad6e303f6', 'Thông tư BHXH', 'bhxh-thong-tu', NULL, 3, NULL, true),
  ('debd32fa-10ac-43c0-a2cc-d3c54a1e78bb', '767ed3c1-ca2e-41dd-a1a2-08dad6e303f6', 'Quyết định BHXH', 'bhxh-quyet-dinh', NULL, 4, NULL, true),
  ('4c29d656-e19f-4c93-a0ee-61bcfc479b35', '767ed3c1-ca2e-41dd-a1a2-08dad6e303f6', 'Công văn BHXH', 'bhxh-cong-van', NULL, 5, NULL, true),
  ('33c404b5-bcb9-4a62-a553-53a2dfeca101', '63d88c12-2036-41f3-a3e3-0928b141d68d', 'Bộ luật lao động', 'lao-dong-bo-luat', NULL, 1, NULL, true),
  ('c575615d-362b-4cb8-ac7f-014b454cd7ce', '63d88c12-2036-41f3-a3e3-0928b141d68d', 'Nghị định lao động', 'lao-dong-nghi-dinh', NULL, 2, NULL, true),
  ('2b0cf088-3380-426d-ab0a-d3c8f326fb6a', '63d88c12-2036-41f3-a3e3-0928b141d68d', 'Thông tư lao động', 'lao-dong-thong-tu', NULL, 3, NULL, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;


-- 2. TẠO STORAGE BUCKETS (LƯU TỆP TÀI LIỆU)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents', 'documents', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

