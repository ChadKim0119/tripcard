/**
 * 여행지 대표 사진 — 여행사 상품 사진이 없을 때 표지로 쓴다.
 * 위키미디어 공용(Wikimedia Commons)의 자유 라이선스 사진 중 각 여행지를 대표하는 명소 사진을 골랐다
 * (영문 위키백과 문서의 대표 사진, 지도·국기·콜라주 제외, 1280px).
 * 목록에 없는 곳은 위키백과에서 그 지역 사진을 찾아 쓴다(findCover).
 */
export const DESTINATION_COVERS: Record<string, string> = {
  "도쿄": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Tokyo_Tower_2023.jpg/1280px-Tokyo_Tower_2023.jpg",
  "오사카": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Osaka_Castle_03bs3200.jpg/1280px-Osaka_Castle_03bs3200.jpg",
  "교토": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Kiyomizu.jpg/1280px-Kiyomizu.jpg",
  "나라": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/T%C5%8Ddai-ji_Kon-d%C5%8D.jpg/1280px-T%C5%8Ddai-ji_Kon-d%C5%8D.jpg",
  "고베": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Port_of_Kobe01s3780.jpg/1280px-Port_of_Kobe01s3780.jpg",
  "후쿠오카": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Fukuoka_Tower_Before_Sunset.jpg/1280px-Fukuoka_Tower_Before_Sunset.jpg",
  "삿포로": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Hokkaido_Sapporo_Odori_Park.jpg/1280px-Hokkaido_Sapporo_Odori_Park.jpg",
  "홋카이도": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/140829_Ichiko_of_Shiretoko_Goko_Lakes_Hokkaido_Japan01s5.jpg/1280px-140829_Ichiko_of_Shiretoko_Goko_Lakes_Hokkaido_Japan01s5.jpg",
  "북해도": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/140829_Ichiko_of_Shiretoko_Goko_Lakes_Hokkaido_Japan01s5.jpg/1280px-140829_Ichiko_of_Shiretoko_Goko_Lakes_Hokkaido_Japan01s5.jpg",
  "비에이": "https://upload.wikimedia.org/wikipedia/commons/e/e7/Biei_Hokkaido.jpg",
  "후라노": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Furano_Snow_Resort_view2.JPG/1280px-Furano_Snow_Resort_view2.JPG",
  "하코다테": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Kanemori_Red_Brick_Warehouse_Hakodate_Hokkaido_pref_Japan01n.jpg/1280px-Kanemori_Red_Brick_Warehouse_Hakodate_Hokkaido_pref_Japan01n.jpg",
  "나고야": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Nagoya_Castle_7.jpg/1280px-Nagoya_Castle_7.jpg",
  "유후인": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Yufuin_and_Mount_Yufu.jpg/1280px-Yufuin_and_Mount_Yufu.jpg",
  "벳푸": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/180131_Umi-Jigoku.jpg/1280px-180131_Umi-Jigoku.jpg",
  "하코네": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/260505_Moto-Hakone_Hakone_Japan01s3.jpg/1280px-260505_Moto-Hakone_Hakone_Japan01s3.jpg",
  "일본": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg/1280px-View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg",
  "다낭": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Golden_Bridge_at_Ba_Na_Hills_20250718.jpg/1280px-Golden_Bridge_at_Ba_Na_Hills_20250718.jpg",
  "호이안": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/2024_H%E1%BB%99i_An_-_Japanese_Covered_Bridge_%28Ch%C3%B9a_C%E1%BA%A7u%29_after_renovation_-_img_11.jpg/1280px-2024_H%E1%BB%99i_An_-_Japanese_Covered_Bridge_%28Ch%C3%B9a_C%E1%BA%A7u%29_after_renovation_-_img_11.jpg",
  "나트랑": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Nha_Trang_%2C_Vietnam_-_panoramio_%2835%29.jpg/1280px-Nha_Trang_%2C_Vietnam_-_panoramio_%2835%29.jpg",
  "하노이": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Thap_Rua.jpg/1280px-Thap_Rua.jpg",
  "호치민": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Saigon_Central_Post_Office_%2852681461470%29.jpg/1280px-Saigon_Central_Post_Office_%2852681461470%29.jpg",
  "푸꾸옥": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Bai-sao-phu-quoc-tuonglamphotos.jpg/1280px-Bai-sao-phu-quoc-tuonglamphotos.jpg",
  "달랏": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Xuan_Huong_Lake_11.jpg/1280px-Xuan_Huong_Lake_11.jpg",
  "하롱베이": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Ha_Long_Bay_in_2019.jpg/1280px-Ha_Long_Bay_in_2019.jpg",
  "베트남": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Ha_Long_Bay_in_2019.jpg/1280px-Ha_Long_Bay_in_2019.jpg",
  "방콕": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg/1280px-%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg",
  "파타야": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Pattaya_beach_from_view_point.jpg/1280px-Pattaya_beach_from_view_point.jpg",
  "푸켓": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/KohPhiPhi.JPG/1280px-KohPhiPhi.JPG",
  "치앙마이": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Wat_Phra_That_Doi_Suthep_-_Chiang_Mai.jpg/1280px-Wat_Phra_That_Doi_Suthep_-_Chiang_Mai.jpg",
  "끄라비": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Railay_Beach_5.jpg/1280px-Railay_Beach_5.jpg",
  "코사무이": "https://upload.wikimedia.org/wikipedia/commons/8/80/Koh_Samui_Lipa_Noi2.jpg",
  "태국": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg/1280px-%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg",
  "싱가포르": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Marina_Bay_Sands_%28I%29.jpg/1280px-Marina_Bay_Sands_%28I%29.jpg",
  "코타키나발루": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg/1280px-Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg",
  "발리": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Pura_Ulun_Danu_Bratan%2C_2022.jpg/1280px-Pura_Ulun_Danu_Bratan%2C_2022.jpg",
  "인도네시아": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Pradaksina.jpg/1280px-Pradaksina.jpg",
  "세부": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Kawasan_Falls_Level_1%2C_Badian%2C_Cebu_in_2026.jpg/1280px-Kawasan_Falls_Level_1%2C_Badian%2C_Cebu_in_2026.jpg",
  "보홀": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Chocolate_Hills_Bohol.JPG/1280px-Chocolate_Hills_Bohol.JPG",
  "마닐라": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Baluartillo_de_San_Jos%C3%A9%2C_Manila%2C_Filipinas%2C_2023-08-26%2C_DD_41.jpg/1280px-Baluartillo_de_San_Jos%C3%A9%2C_Manila%2C_Filipinas%2C_2023-08-26%2C_DD_41.jpg",
  "사이판": "https://upload.wikimedia.org/wikipedia/commons/2/27/Saipan_at_Night.jpg",
  "하와이": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/City_of_Waikiki_view.jpg/1280px-City_of_Waikiki_view.jpg",
  "호놀룰루": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/City_of_Waikiki_view.jpg/1280px-City_of_Waikiki_view.jpg",
  "타이중": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Sunset_of_Gaomei_Wetland.JPG/1280px-Sunset_of_Gaomei_Wetland.JPG",
  "대만": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/A-mei_Tea_House.jpg/1280px-A-mei_Tea_House.jpg",
  "마카오": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/%E5%A4%A7%E4%B8%89%E5%B7%B4%E7%89%8C%E5%9D%8A.jpg/1280px-%E5%A4%A7%E4%B8%89%E5%B7%B4%E7%89%8C%E5%9D%8A.jpg",
  "상하이": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Bund_2.jpg/1280px-The_Bund_2.jpg",
  "베이징": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Forbidden_City_-_View_from_Coal_Hill.jpg/1280px-The_Forbidden_City_-_View_from_Coal_Hill.jpg",
  "장가계": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/1_tianzishan_wulingyuan_zhangjiajie_2012.jpg/1280px-1_tianzishan_wulingyuan_zhangjiajie_2012.jpg",
  "중국": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/1280px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg",
  "울란바토르": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Gorkhi-Terelj_National_Park.jpg/1280px-Gorkhi-Terelj_National_Park.jpg",
  "몽골": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Gorkhi-Terelj_National_Park.jpg/1280px-Gorkhi-Terelj_National_Park.jpg",
  "라오스": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Phou_si_Luang_Prabang_Laos_%E3%83%97%E3%83%BC%E3%82%B7%E3%83%BC%E3%81%AE%E4%B8%98_%E3%83%A9%E3%82%AA%E3%82%B9%E3%83%BB%E3%83%AB%E3%82%A2%E3%83%B3%E3%83%97%E3%83%A9%E3%83%90%E3%83%BC%E3%83%B3_DSCF6777.jpg/1280px-Phou_si_Luang_Prabang_Laos_%E3%83%97%E3%83%BC%E3%82%B7%E3%83%BC%E3%81%AE%E4%B8%98_%E3%83%A9%E3%82%AA%E3%82%B9%E3%83%BB%E3%83%AB%E3%82%A2%E3%83%B3%E3%83%97%E3%83%A9%E3%83%90%E3%83%BC%E3%83%B3_DSCF6777.jpg",
  "비엔티안": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Pha_That_Luang%2C_July_2023.jpg/1280px-Pha_That_Luang%2C_July_2023.jpg",
  "루앙프라방": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Phou_si_Luang_Prabang_Laos_%E3%83%97%E3%83%BC%E3%82%B7%E3%83%BC%E3%81%AE%E4%B8%98_%E3%83%A9%E3%82%AA%E3%82%B9%E3%83%BB%E3%83%AB%E3%82%A2%E3%83%B3%E3%83%97%E3%83%A9%E3%83%90%E3%83%BC%E3%83%B3_DSCF6777.jpg/1280px-Phou_si_Luang_Prabang_Laos_%E3%83%97%E3%83%BC%E3%82%B7%E3%83%BC%E3%81%AE%E4%B8%98_%E3%83%A9%E3%82%AA%E3%82%B9%E3%83%BB%E3%83%AB%E3%82%A2%E3%83%B3%E3%83%97%E3%83%A9%E3%83%90%E3%83%BC%E3%83%B3_DSCF6777.jpg",
  "캄보디아": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/1280px-Angkor_Wat.jpg",
  "씨엠립": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/1280px-Angkor_Wat.jpg",
  "파리": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/1280px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
  "런던": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Tower_Bridge_at_Dawn.jpg/1280px-Tower_Bridge_at_Dawn.jpg",
  "로마": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/1280px-Colosseo_2020.jpg",
  "피렌체": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Cattedrale_di_Santa_Maria_del_Fiore_%E2%80%93_Il_Duomo_di_Firenze.jpg/1280px-Cattedrale_di_Santa_Maria_del_Fiore_%E2%80%93_Il_Duomo_di_Firenze.jpg",
  "베네치아": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/View_of_the_Grand_Canal_from_Rialto_to_Ca%27Foscari.jpg/1280px-View_of_the_Grand_Canal_from_Rialto_to_Ca%27Foscari.jpg",
  "밀라노": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/Milan_Cathedral_from_Piazza_del_Duomo.jpg/1280px-Milan_Cathedral_from_Piazza_del_Duomo.jpg",
  "바르셀로나": "https://upload.wikimedia.org/wikipedia/commons/e/ef/SF_maig_2_cropped.jpg",
  "마드리드": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Palacio_Real_de_Madrid_Julio_2016_%28cropped%29.jpg/1280px-Palacio_Real_de_Madrid_Julio_2016_%28cropped%29.jpg",
  "스위스": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Matterhorn_from_Domh%C3%BCtte_-_2.jpg/1280px-Matterhorn_from_Domh%C3%BCtte_-_2.jpg",
  "인터라켄": "https://upload.wikimedia.org/wikipedia/commons/d/d7/Jungfrau03.jpg",
  "프라하": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg/1280px-Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg",
  "빈": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Wien_-_Schloss_Sch%C3%B6nbrunn.JPG/1280px-Wien_-_Schloss_Sch%C3%B6nbrunn.JPG",
  "부다페스트": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg/1280px-Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg",
  "이탈리아": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/1280px-Colosseo_2020.jpg",
  "프랑스": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/1280px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
  "스페인": "https://upload.wikimedia.org/wikipedia/commons/e/ef/SF_maig_2_cropped.jpg",
  "포르투갈": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Torre_Bel%C3%A9m_April_2009-4a.jpg/1280px-Torre_Bel%C3%A9m_April_2009-4a.jpg",
  "리스본": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Torre_Bel%C3%A9m_April_2009-4a.jpg/1280px-Torre_Bel%C3%A9m_April_2009-4a.jpg",
  "독일": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Schloss_Neuschwanstein_2013.jpg/1280px-Schloss_Neuschwanstein_2013.jpg",
  "뮌헨": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Rathaus_and_Marienplatz_from_Peterskirche_-_August_2006.jpg/1280px-Rathaus_and_Marienplatz_from_Peterskirche_-_August_2006.jpg",
  "영국": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Tower_Bridge_at_Dawn.jpg/1280px-Tower_Bridge_at_Dawn.jpg",
  "아이슬란드": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/2008-05-24_35_Sk%C3%B3gafoss.jpg/1280px-2008-05-24_35_Sk%C3%B3gafoss.jpg",
  "터키": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Hagia_Sophia_%28228968325%29.jpeg/1280px-Hagia_Sophia_%28228968325%29.jpeg",
  "이스탄불": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Hagia_Sophia_%28228968325%29.jpeg/1280px-Hagia_Sophia_%28228968325%29.jpeg",
  "이집트": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Pyramids_of_the_Giza_Necropolis.jpg/1280px-Pyramids_of_the_Giza_Necropolis.jpg",
  "뉴욕": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Brooklyn_Bridge_and_the_Lower_Manhattan_skyline_from_Pebble_Beach%2C_New_York.jpg/1280px-Brooklyn_Bridge_and_the_Lower_Manhattan_skyline_from_Pebble_Beach%2C_New_York.jpg",
  "로스앤젤레스": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Hollywood_sign_%288485145044%29.jpg/1280px-Hollywood_sign_%288485145044%29.jpg",
  "샌프란시스코": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg/1280px-Golden_Gate_Bridge_as_seen_from_Battery_East.jpg",
  "라스베이거스": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Las_Vegas_Strip_09_2017_4897.jpg/1280px-Las_Vegas_Strip_09_2017_4897.jpg",
  "시애틀": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Space_Needle_2011-07-04.jpg/1280px-Space_Needle_2011-07-04.jpg",
  "캐나다": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Moraine_Lake_17092005.jpg/1280px-Moraine_Lake_17092005.jpg",
  "미국": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Canyon_River_Tree_%28165872763%29.jpeg/1280px-Canyon_River_Tree_%28165872763%29.jpeg",
  "시드니": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Sydney_Australia._%2821339175489%29.jpg/1280px-Sydney_Australia._%2821339175489%29.jpg",
  "멜버른": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Flinders_Station_and_trams.jpg/1280px-Flinders_Station_and_trams.jpg",
  "호주": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Sydney_Australia._%2821339175489%29.jpg/1280px-Sydney_Australia._%2821339175489%29.jpg",
  "뉴질랜드": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Milford_Sound_%28New_Zealand%29.JPG/1280px-Milford_Sound_%28New_Zealand%29.JPG",
  "제주": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Seongsan_Ilchulbong_from_the_air.jpg/1280px-Seongsan_Ilchulbong_from_the_air.jpg",
  "부산": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Haeundae_Beach_May_2024.jpg/1280px-Haeundae_Beach_May_2024.jpg",
  "강릉": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Jumunjin_Lighthouse_20220501_026.jpg/1280px-Jumunjin_Lighthouse_20220501_026.jpg",
  "속초": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Dinosaur_Ridge_of_Seoraksan.jpg/1280px-Dinosaur_Ridge_of_Seoraksan.jpg",
  "양양": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Korea-Naksansa_2215-07_grounds.JPG",
  "경주": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Lotus_Flower_Bridge_and_Seven_Treasure_Bridge_at_Bulguksa_in_Gyeongju%2C_Korea.jpg/1280px-Lotus_Flower_Bridge_and_Seven_Treasure_Bridge_at_Bulguksa_in_Gyeongju%2C_Korea.jpg",
  "여수": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Dolsan_Bridge1.JPG/1280px-Dolsan_Bridge1.JPG",
  "포항": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Homigot_Lighthouse_from_New_Millennium_Memorial_Hall.jpg/1280px-Homigot_Lighthouse_from_New_Millennium_Memorial_Hall.jpg",
  "안동": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Hahoe_Folk_Village_02.jpg/1280px-Hahoe_Folk_Village_02.jpg",
  "가평": "https://upload.wikimedia.org/wikipedia/commons/7/79/Nami_Island.JPG",
  "춘천": "https://upload.wikimedia.org/wikipedia/commons/7/79/Nami_Island.JPG",
  "서울": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/%EA%B4%91%ED%99%94%EB%AC%B8_%EC%9B%94%EB%8C%80.jpg/1280px-%EA%B4%91%ED%99%94%EB%AC%B8_%EC%9B%94%EB%8C%80.jpg",
  "인천": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Songdo_Central_Park_in_2021.jpg/1280px-Songdo_Central_Park_in_2021.jpg",
  "대구": "https://upload.wikimedia.org/wikipedia/commons/0/05/Korea-Daegu-Palgongsan-01.jpg",
  "광주": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Mt_Mudeungsan_-_panoramio.jpg/1280px-Mt_Mudeungsan_-_panoramio.jpg",
  "대전": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Korea-Daejeon-Uam_Historic_Park-01.jpg/1280px-Korea-Daejeon-Uam_Historic_Park-01.jpg",
  "평창": "https://upload.wikimedia.org/wikipedia/commons/c/c5/%EC%9B%94%EC%A0%95%EC%82%AC1.jpg",
  "태안": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Gauido_at_Taeanhaean_National_Park_image_2.jpg/1280px-Gauido_at_Taeanhaean_National_Park_image_2.jpg",
  "단양": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Panoramic_view_of_Danyang-eup.jpg/1280px-Panoramic_view_of_Danyang-eup.jpg",
};

const KEYS = Object.keys(DESTINATION_COVERS).sort((a, b) => b.length - a.length);

/** 목적지 이름(또는 그 이름이 들어간 문장)에 맞는 대표 사진 — 네트워크 없이 바로 */
export function coverFromMap(destination: string | null | undefined): string | null {
  const d = (destination ?? '').trim();
  if (!d) return null;
  if (DESTINATION_COVERS[d]) return DESTINATION_COVERS[d];
  // 한 글자 이름(빈)은 다른 낱말에 섞이기 쉬워 정확히 같을 때만
  const key = KEYS.find((k) => k.length > 1 && d.includes(k));
  return key ? DESTINATION_COVERS[key] : null;
}

const BAD_IMAGE = /map|flag|locator|montage|collage|logo|seal|emblem|coat_of_arms|\.svg$|\.png$/i;

/** 목록에 없는 목적지: 한국어 위키백과 문서의 대표 사진 (지도·국기 등은 거른다) */
export async function findCover(destination: string | null | undefined): Promise<string | null> {
  const mapped = coverFromMap(destination);
  if (mapped || !destination?.trim()) return mapped;
  try {
    const q = new URLSearchParams({
      action: 'query',
      prop: 'pageimages',
      piprop: 'thumbnail|name',
      pithumbsize: '1280',
      titles: destination.trim(),
      redirects: '1',
      format: 'json',
      origin: '*',
    });
    const r = await fetch(`https://ko.wikipedia.org/w/api.php?${q}`);
    if (!r.ok) return null;
    const pages = Object.values((await r.json())?.query?.pages ?? {}) as { pageimage?: string; thumbnail?: { source?: string } }[];
    const p = pages.find((x) => x.thumbnail?.source && x.pageimage && !BAD_IMAGE.test(x.pageimage));
    return p?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}
