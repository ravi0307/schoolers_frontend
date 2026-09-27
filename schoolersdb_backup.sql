-- ==========================================================================
-- Schoolers - full data extract (COPY blocks + setval, no schema DDL)
-- ==========================================================================
-- Generated : 2026-09-27 18:43:20
-- Source    : schoolersdb @ localhost:5432 (PostgreSQL 17.10)
-- Scope     : schema 'schoolers' - 29 tables, 294 rows
-- Restore   : psql -U <user> -d <target_db> -v ON_ERROR_STOP=1 \
--                          -f schoolers_data.sql
--
-- The target database must already have the 'schoolers' schema and its
-- tables/constraints (dump it with: pg_dump --schema-only). Each table is
-- loaded with a COPY block, then its sequence is advanced with setval() so
-- later inserts do not collide.
--
-- 'schoolers.schools' and 'schoolers.users' reference each other
-- (schools.modified_by -> users.user_id, users.school_id ->
-- schools.school_id), so a plain data-only load would fail on FK
-- order. This file sets session_replication_role=replica while
-- loading and restores the default afterwards, which is the standard
-- fix and requires a superuser connection.
--
-- Users also have a self-reference (users.modified_by -> users.user_id).
--
-- Row counts:
--   activities                    6
--   attendance                   20
--   barter_listings               6
--   broadcasts                    8
--   classes                       6
--   holidays                     14
--   leave_requests                6
--   marks                        30
--   media                         4
--   parent_student               10
--   parents                      10
--   periods                      10
--   pilots                        4
--   route_stops                  16
--   route_students               10
--   routes                        4
--   school_notifications          6
--   schools                       2
--   staff                        16
--   staff_attendance             28
--   students                     10
--   subjects                     12
--   teacher_class_subjects       12
--   timetable_entries             6
--   users                        22
--   vehicles                      4
--   website_pages                 6
--   website_settings              2
--   website_testimonials          4
--   TOTAL                       294
-- ==========================================================================
--
-- PostgreSQL database dump
--

\restrict 84gTu3GXwCT4QTJrFE5UaZ3PyYcT8pwhLdhtAiibpk41tFjlZk7pe0JoMkgeQ7T

-- Dumped from database version 17.10 (Postgres.app)
-- Dumped by pg_dump version 17.10 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
-- Disable FK triggers while loading (circular schools<->users); see header.
SET session_replication_role = replica;


--
-- Data for Name: schools; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.schools (school_id, name, address, pincode, city, state, country, primary_contact, alternative_contact, primary_email, alternative_email, status, route_enabled, website_enabled, library_enabled, fees_enabled, salary_enabled, created_at, is_active, logo_url, modified_by, modified_at, first_name, last_name) FROM stdin;
1	Green Valley Public School	12 MG Road	560001	Bengaluru	Karnataka	India	8105096987	8105096987	ravigupta0307@gmail.com	ravigupta0307@gmail.com	Active	t	t	t	t	t	2026-09-27 18:19:16.899384	t	\N	272	2026-09-27 18:19:42.373422	Ravi	Gupta
2	Blue Horizon Academy	45 Park Street	560002	Bengaluru	Karnataka	India	8105096987	8105096987	ravigupta0307@gmail.com	ravigupta0307@gmail.com	Active	t	t	t	t	t	2026-09-27 18:19:21.250223	t	\N	272	2026-09-27 18:19:42.389411	Ravi	Gupta
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.users (user_id, school_id, role, username, password_hash, linked_person_id, last_login, created_at, is_active, email, password_reset_token, password_reset_token_expires_at, modified_by, modified_at) FROM stdin;
336	2	parent	parent7	$2b$12$kG57wo0KH8377NNLhOo3Q.VMvP8LzlTF/hQ07T69BhgwMOpFkAF/C	7	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
1	\N	master	meera.nair	$2b$12$IudhV7cP9pULjNvCExQP6eRlOfV6PbqK9E443rXBlsq6l/gQ/V796	\N	2026-09-27 18:18:45.322398	2026-07-31 03:29:04.273559	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:18:44.950848
337	2	parent	parent8	$2b$12$AA1rYrblCb3BeWjTMDqe/eu0nCXdhQ.jGIU0hRQ91IOJRdP3cAXsa	8	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
339	2	teacher	teacher8	$2b$12$x9BtgKqxJpNK6YF3Iosa0O9Cp6ljyF7TvBz/yEKITk3brcDdSjpKC	8	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
340	2	teacher	teacher9	$2b$12$e0nXNMfYjL3xHYQTFHm4/e46OMkl7yx16TixN9LsJc8wczdJRO20G	9	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
341	2	staff	staff10	$2b$12$DMZ//tg6LejUCSfvbxo9nOZxSnr2VbFFeGProOM1PDrrT2u6Q4fyK	10	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
272	\N	master	ravi	$2b$12$IudhV7cP9pULjNvCExQP6eRlOfV6PbqK9E443rXBlsq6l/gQ/V796	\N	2026-09-27 18:32:48.787671	2026-08-29 14:37:10.305702	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:32:48.522263
338	2	teacher	teacher7	$2b$12$sLM1kQMMtX5.6rzJ88LqS.VMiuvCoUOXCaI1HePVXLIqqUmrBdH2a	7	2026-09-27 18:29:16.294692	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:29:15.989524
324	1	pilot	pilot1.1	$2b$12$BxAU4qgl0Ueg7AnZeI1hbOjksFWkVY5MUfvqB424zXfFwSaLqPFY6	13	2026-09-27 18:29:31.54497	2026-09-27 18:22:38.927812	t	\N	\N	\N	322	2026-09-27 18:29:31.302876
331	1	teacher	teacher1	$2b$12$1/x7qrnMSMOb/IPelH/Jq.hL14FSank8bHav492zkdQkYJLA6LR2.	1	2026-09-27 18:33:39.526904	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:33:39.160197
326	2	pilot	pilot1.2	$2b$12$YoY6/UETa8uVZsM1Lwv4tugkIkwXn7C/aRY7IKO0EQl.LZO9k6WN.	15	2026-09-27 18:29:32.422923	2026-09-27 18:22:40.075416	t	\N	\N	\N	323	2026-09-27 18:29:32.121364
327	2	pilot	pilot2.2	$2b$12$Gtya/nGoKSqUVXPy0AIn6uNmP5SYm44.J5EMcglaUNUXiHpLA5NlK	16	\N	2026-09-27 18:22:40.457703	t	\N	\N	\N	323	2026-09-27 18:22:40.457703
322	1	admin	ravi.gupta	$2b$12$rQobbvlplQ98RCyQyTi0fORfiufVUFIZXIOMUlrFwg0B7dlJed7rO	\N	2026-09-27 18:34:22.752843	2026-09-27 18:19:16.915473	t	ravigupta0307@gmail.com	\N	\N	272	2026-09-27 18:34:22.408471
328	1	parent	parent1	$2b$12$BL13oH1l1JDB.DXQCbSk8ukMBpJCSgZVZxtRP.ktqIEha3p9ia/qy	1	2026-09-27 18:34:23.173109	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:34:22.827246
323	2	admin	ravi.gupta2	$2b$12$wVArPRUhQPTxA.QCrFwSt.2m6tUHfKx2X1KEjAL5sEngWFbRlk6JG	\N	2026-09-27 18:34:56.727112	2026-09-27 18:19:21.258629	t	ravigupta0307@gmail.com	\N	\N	272	2026-09-27 18:34:56.381044
329	1	parent	parent2	$2b$12$JDSPfzj3wd0CucVjZHCWvuvuf74mcy/f25L7tbbVIXLkh7PBSyjxi	2	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
330	1	parent	parent3	$2b$12$UxykkRyqYUayLISC5IQypeznphLoBxuu17Wy1coE1OzXaG8d1H.wi	3	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
332	1	teacher	teacher2	$2b$12$ur6gR8.AIO6XlSsXfvJHZuGdo8UyDq0ABtqU5pQWhyd0IkQypFvLO	2	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
333	1	teacher	teacher3	$2b$12$vzpQ6xnXL6q2PBrnlQ9SUOaao8kM0Ce4.UZPJa5cG2dtoW.rr7xPO	3	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
334	1	staff	staff4	$2b$12$JBTXSR/Arp1GLmK1FlxPKeVcnoDbedgw8/rfjJzOrAiReRbF3N4Wa	4	\N	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:24:48.010881
325	1	pilot	pilot2.1	$2b$12$ISYXpZXzmuIIChWlYUArw.B.hZIUaRx4.s/JVvXq2fSGa9Vh80F8q	14	2026-09-27 18:28:52.212222	2026-09-27 18:22:39.303867	t	\N	\N	\N	322	2026-09-27 18:28:51.85044
335	2	parent	parent6	$2b$12$6ksl.5Ieix40CdORnuJJHOgoXUE9BgnDKi/uM8/lyYpCeP77TwzWq	6	2026-09-27 18:34:57.168168	2026-09-27 18:24:48.010881	t	ravigupta0307@gmail.com	\N	\N	\N	2026-09-27 18:34:56.821821
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.activities (activity_id, school_id, tag, title, description, published_at, is_active, modified_by, modified_at) FROM stdin;
1	1	Sports	Annual Sports Day	Inter-house athletics and prize distribution.	2026-09-27 18:33:26.354228	t	322	2026-09-27 18:33:26.354228
2	1	Academic	Science Fair	Projects from grades 1 to 3.	2026-09-27 18:33:26.380164	t	322	2026-09-27 18:33:26.380164
3	1	Cultural	Krishna Janmashtami	Music and dance by the cultural club.	2026-09-27 18:33:26.393098	t	322	2026-09-27 18:33:26.393098
4	2	Sports	Annual Sports Day	Inter-house athletics and prize distribution.	2026-09-27 18:34:56.745986	t	323	2026-09-27 18:34:56.745986
5	2	Academic	Science Fair	Projects from grades 1 to 3.	2026-09-27 18:34:56.75657	t	323	2026-09-27 18:34:56.75657
6	2	Cultural	Krishna Janmashtami	Music and dance by the cultural club.	2026-09-27 18:34:56.766819	t	323	2026-09-27 18:34:56.766819
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.staff (staff_id, school_id, name, role, phone, created_at, is_active, email, present_address, permanent_address, aadhaar_card, emergency_number, date_of_birth, marital_status, gender, driving_license, modified_by, modified_at, role_title, person_type) FROM stdin;
7	2	Anita Sharma	Mathematics	8105096987	2026-09-27 18:22:00.83155	t	ravigupta0307@gmail.com	45 Park Street, Bengaluru	45 Park Street, Bengaluru	90000000201	8105096987	1988-04-12	Married	Female	\N	323	2026-09-27 18:22:00.83155	\N	teacher
8	2	Bhavesh Rao	English	8105096987	2026-09-27 18:22:04.5385	t	ravigupta0307@gmail.com	45 Park Street, Bengaluru	45 Park Street, Bengaluru	90000000211	8105096987	1988-04-12	Married	Female	\N	323	2026-09-27 18:22:04.5385	\N	teacher
9	2	Chitra Menon	Science	8105096987	2026-09-27 18:22:08.466959	t	ravigupta0307@gmail.com	45 Park Street, Bengaluru	45 Park Street, Bengaluru	90000000221	8105096987	1988-04-12	Married	Female	\N	323	2026-09-27 18:22:08.466959	\N	teacher
10	2	Deepak Iyer	Clerk	8105096987	2026-09-27 18:22:12.321429	t	ravigupta0307@gmail.com	45 Park Street, Bengaluru	45 Park Street, Bengaluru	90000000202	8105096987	1990-07-01	Single	Male	\N	323	2026-09-27 18:22:12.321429	\N	staff
11	2	Esha Kulkarni	Librarian	8105096987	2026-09-27 18:22:19.221065	t	ravigupta0307@gmail.com	45 Park Street, Bengaluru	45 Park Street, Bengaluru	90000000212	8105096987	1990-07-01	Single	Male	\N	323	2026-09-27 18:22:19.221065	\N	staff
12	2	Farhan Ali	School Administrator	8105096987	2026-09-27 18:22:23.295052	t	ravigupta0307@gmail.com	45 Park Street, Bengaluru	45 Park Street, Bengaluru	90000000222	8105096987	1990-07-01	Single	Male	\N	323	2026-09-27 18:22:23.295052	\N	admin
13	1	Ganesh Pillai	Pilot	8105096987	2026-09-27 18:22:38.927812	t	ravigupta0307@gmail.com	Bangalore	Bangalore	80000000103	\N	\N	\N	\N	KA012019991	322	2026-09-27 18:22:38.927812	Pilot	pilot
14	1	Hema Nair	Pilot	8105096987	2026-09-27 18:22:39.303867	t	ravigupta0307@gmail.com	Bangalore	Bangalore	80000000113	\N	\N	\N	\N	KA012020054	322	2026-09-27 18:22:39.303867	Pilot	pilot
15	2	Ganesh Pillai	Pilot	8105096987	2026-09-27 18:22:40.075416	t	ravigupta0307@gmail.com	Bangalore	Bangalore	80000000203	\N	\N	\N	\N	KA012019991	323	2026-09-27 18:22:40.075416	Pilot	pilot
16	2	Hema Nair	Pilot	8105096987	2026-09-27 18:22:40.457703	t	ravigupta0307@gmail.com	Bangalore	Bangalore	80000000213	\N	\N	\N	\N	KA012020054	323	2026-09-27 18:22:40.457703	Pilot	pilot
1	1	Anita Sharma	Mathematics	8105096987	2026-09-27 18:21:31.369514	t	ravigupta0307@gmail.com	12 MG Road, Bengaluru	12 MG Road, Bengaluru	90000000101	8105096987	1988-04-12	Married	Female	\N	322	2026-09-27 18:21:31.369514	\N	teacher
2	1	Bhavesh Rao	English	8105096987	2026-09-27 18:21:37.281745	t	ravigupta0307@gmail.com	12 MG Road, Bengaluru	12 MG Road, Bengaluru	90000000111	8105096987	1988-04-12	Married	Female	\N	322	2026-09-27 18:21:37.281745	\N	teacher
3	1	Chitra Menon	Science	8105096987	2026-09-27 18:21:45.336861	t	ravigupta0307@gmail.com	12 MG Road, Bengaluru	12 MG Road, Bengaluru	90000000121	8105096987	1988-04-12	Married	Female	\N	322	2026-09-27 18:21:45.336861	\N	teacher
4	1	Deepak Iyer	Clerk	8105096987	2026-09-27 18:21:48.998558	t	ravigupta0307@gmail.com	12 MG Road, Bengaluru	12 MG Road, Bengaluru	90000000102	8105096987	1990-07-01	Single	Male	\N	322	2026-09-27 18:21:48.998558	\N	staff
5	1	Esha Kulkarni	Librarian	8105096987	2026-09-27 18:21:52.808176	t	ravigupta0307@gmail.com	12 MG Road, Bengaluru	12 MG Road, Bengaluru	90000000112	8105096987	1990-07-01	Single	Male	\N	322	2026-09-27 18:21:52.808176	\N	staff
6	1	Farhan Ali	School Administrator	8105096987	2026-09-27 18:21:56.616071	t	ravigupta0307@gmail.com	12 MG Road, Bengaluru	12 MG Road, Bengaluru	90000000122	8105096987	1990-07-01	Single	Male	\N	322	2026-09-27 18:21:56.616071	\N	admin
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.classes (class_id, school_id, name, class_teacher_staff_id, student_count, is_active, modified_by, modified_at) FROM stdin;
1	1	Class 1	1	0	t	322	2026-09-27 18:22:47.192591
2	1	Class 2	2	0	t	322	2026-09-27 18:22:47.205478
3	1	Class 3	3	0	t	322	2026-09-27 18:22:47.21709
4	2	Class 1	7	0	t	323	2026-09-27 18:22:47.601221
5	2	Class 2	8	0	t	323	2026-09-27 18:22:47.614699
6	2	Class 3	9	0	t	323	2026-09-27 18:22:47.626615
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.students (student_id, school_id, class_id, admission_no, name, date_of_birth, gender, present_today, created_at, is_active, photo_url, aadhaar_number, birth_certificate_number, documents, modified_by, modified_at) FROM stdin;
1	1	1	ADM1001	Aarav Sharma	2014-06-15	Male	t	2026-09-27 18:23:36.51836	t	\N	70000000105	BC10001	null	322	2026-09-27 18:23:36.51836
2	1	2	ADM1002	Diya Kapoor	2014-06-15	Female	t	2026-09-27 18:23:40.534083	t	\N	70000000115	BC10002	null	322	2026-09-27 18:23:40.534083
3	1	3	ADM1003	Ishaan Verma	2014-06-15	Male	t	2026-09-27 18:23:44.217625	t	\N	70000000125	BC10003	null	322	2026-09-27 18:23:44.217625
4	1	1	ADM1004	Kavya Menon	2014-06-15	Female	t	2026-09-27 18:23:48.606682	t	\N	70000000135	BC10004	null	322	2026-09-27 18:23:48.606682
5	1	2	ADM1005	Rohan Das	2014-06-15	Male	t	2026-09-27 18:23:55.746348	t	\N	70000000145	BC10005	null	322	2026-09-27 18:23:55.746348
6	2	4	ADM2001	Aarav Sharma	2014-06-15	Male	t	2026-09-27 18:24:00.046471	t	\N	70000000205	BC20001	null	323	2026-09-27 18:24:00.046471
7	2	5	ADM2002	Diya Kapoor	2014-06-15	Female	t	2026-09-27 18:24:03.872604	t	\N	70000000215	BC20002	null	323	2026-09-27 18:24:03.872604
8	2	6	ADM2003	Ishaan Verma	2014-06-15	Male	t	2026-09-27 18:24:07.873628	t	\N	70000000225	BC20003	null	323	2026-09-27 18:24:07.873628
9	2	4	ADM2004	Kavya Menon	2014-06-15	Female	t	2026-09-27 18:24:11.437985	t	\N	70000000235	BC20004	null	323	2026-09-27 18:24:11.437985
10	2	5	ADM2005	Rohan Das	2014-06-15	Male	t	2026-09-27 18:24:15.697536	t	\N	70000000245	BC20005	null	323	2026-09-27 18:24:15.697536
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.attendance (attendance_id, student_id, class_id, date, status, modified_by, modified_at, marked_by) FROM stdin;
1	1	1	2026-09-25	Present	\N	2026-09-27 18:28:30.497446	1
2	4	1	2026-09-25	Present	\N	2026-09-27 18:28:30.497446	1
3	2	2	2026-09-25	Present	\N	2026-09-27 18:28:30.907337	\N
4	5	2	2026-09-25	Present	\N	2026-09-27 18:28:30.907337	\N
5	3	3	2026-09-25	Present	\N	2026-09-27 18:28:30.925307	\N
6	1	1	2026-09-26	Present	\N	2026-09-27 18:28:30.940474	1
7	4	1	2026-09-26	Present	\N	2026-09-27 18:28:30.940474	1
8	2	2	2026-09-26	Present	\N	2026-09-27 18:28:30.958014	\N
9	5	2	2026-09-26	Present	\N	2026-09-27 18:28:30.958014	\N
10	3	3	2026-09-26	Present	\N	2026-09-27 18:28:30.975299	\N
11	6	4	2026-09-25	Present	\N	2026-09-27 18:28:31.381688	7
12	9	4	2026-09-25	Present	\N	2026-09-27 18:28:31.381688	7
13	7	5	2026-09-25	Present	\N	2026-09-27 18:28:31.778047	\N
14	10	5	2026-09-25	Present	\N	2026-09-27 18:28:31.778047	\N
15	8	6	2026-09-25	Present	\N	2026-09-27 18:28:31.79699	\N
16	6	4	2026-09-26	Present	\N	2026-09-27 18:28:31.80985	7
17	9	4	2026-09-26	Present	\N	2026-09-27 18:28:31.80985	7
18	7	5	2026-09-26	Present	\N	2026-09-27 18:28:31.826877	\N
19	10	5	2026-09-26	Present	\N	2026-09-27 18:28:31.826877	\N
20	8	6	2026-09-26	Present	\N	2026-09-27 18:28:31.84709	\N
\.


--
-- Data for Name: barter_listings; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.barter_listings (listing_id, school_id, title, price, icon, listed_by, created_at, is_active, modified_by, modified_at) FROM stdin;
2	1	Study Table	Rs. 1500	table	Parent	2026-09-27 18:33:39.078882	t	328	2026-09-27 18:33:39.078882
1	1	Bicycle	Rs. 2300	bike	Parent	2026-09-27 18:33:39.050025	t	328	2026-09-27 18:33:39.121226
3	1	Study Chair	Rs. 800	chair	Parent	2026-09-27 18:33:39.092586	f	328	2026-09-27 18:33:39.138939
4	2	Bicycle	Rs. 2500	bike	Parent	2026-09-27 18:34:57.187626	t	335	2026-09-27 18:34:57.187626
5	2	Study Table	Rs. 1500	table	Parent	2026-09-27 18:34:57.197947	t	335	2026-09-27 18:34:57.197947
6	2	Study Chair	Rs. 800	chair	Parent	2026-09-27 18:34:57.208287	t	335	2026-09-27 18:34:57.208287
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.routes (route_id, school_id, name, vehicle, status, created_at, is_active, modified_by, modified_at) FROM stdin;
1	1	Route 1	KA01AB1234	On route	2026-09-27 18:29:31.162159	t	322	2026-09-27 18:29:31.162159
2	1	Route 2	KA01CD5678	On route	2026-09-27 18:29:31.176013	t	322	2026-09-27 18:29:31.176013
3	2	Route 1	KA01AB1234	On route	2026-09-27 18:29:31.915103	t	323	2026-09-27 18:29:31.915103
4	2	Route 2	KA01CD5678	On route	2026-09-27 18:29:31.933713	t	323	2026-09-27 18:29:31.933713
\.


--
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.broadcasts (broadcast_id, school_id, class_id, scope, role_name, message, created_at, is_active, sender_name, route_id, modified_by, modified_at) FROM stdin;
2	1	1	class	Admin	Class 1 science test on Friday.	2026-09-27 18:31:39.666935	t	Admin	\N	322	2026-09-27 18:31:39.666935
3	1	\N	route	Admin	Route 1 delayed 15 minutes today.	2026-09-27 18:31:39.689537	t	Admin	1	322	2026-09-27 18:31:39.689537
4	1	\N	pilot	Admin	Pilots: submit daily logs by 6pm.	2026-09-27 18:31:39.705869	t	Admin	\N	322	2026-09-27 18:31:39.705869
1	1	\N	school	Admin	School reopens Monday 8:30am (updated).	2026-09-27 18:31:40.127181	t	Admin	\N	322	2026-09-27 18:31:40.127181
5	2	\N	school	Admin	School reopens Monday 8am.	2026-09-27 18:34:56.77979	t	Admin	\N	323	2026-09-27 18:34:56.77979
6	2	4	class	Admin	Class 4 science test on Friday.	2026-09-27 18:34:56.790231	t	Admin	\N	323	2026-09-27 18:34:56.790231
7	2	\N	route	Admin	Route 3 delayed 15 minutes today.	2026-09-27 18:34:56.801042	t	Admin	3	323	2026-09-27 18:34:56.801042
8	2	\N	pilot	Admin	Pilots: submit daily logs by 6pm.	2026-09-27 18:34:56.812689	t	Admin	\N	323	2026-09-27 18:34:56.812689
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.holidays (holiday_id, school_id, day_of_week, is_holiday, modified_by, modified_at) FROM stdin;
2	1	Mon	f	\N	2026-09-27 18:21:17.661349
3	1	Tue	f	\N	2026-09-27 18:21:17.661349
4	1	Wed	f	\N	2026-09-27 18:21:17.661349
5	1	Thu	f	\N	2026-09-27 18:21:17.661349
6	1	Fri	f	\N	2026-09-27 18:21:17.661349
9	2	Mon	f	\N	2026-09-27 18:21:17.661349
10	2	Tue	f	\N	2026-09-27 18:21:17.661349
11	2	Wed	f	\N	2026-09-27 18:21:17.661349
12	2	Thu	f	\N	2026-09-27 18:21:17.661349
13	2	Fri	f	\N	2026-09-27 18:21:17.661349
8	1	Sun	t	322	2026-09-27 18:21:18.500895
7	1	Sat	t	322	2026-09-27 18:21:18.52104
15	2	Sun	t	323	2026-09-27 18:21:18.95956
14	2	Sat	t	323	2026-09-27 18:21:18.972371
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.leave_requests (leave_id, school_id, requester_type, requester_name, from_date, to_date, reason, status, created_at, is_active, modified_by, modified_at) FROM stdin;
1	1	Student	Test Student	2026-10-01	2026-10-02	Family function	Pending	2026-09-27 18:29:14.660122	t	322	2026-09-27 18:29:14.660122
2	1	Teacher	Test Teacher	2026-10-05	2026-10-05	Medical	Approved	2026-09-27 18:29:15.008907	t	322	2026-09-27 18:29:15.374027
3	1	Pilot	Ganesh Pillai	2026-10-07	2026-10-07	Vehicle service	Rejected	2026-09-27 18:29:15.349154	t	322	2026-09-27 18:29:15.390518
4	2	Student	Test Student	2026-10-01	2026-10-02	Family function	Pending	2026-09-27 18:29:16.326781	t	323	2026-09-27 18:29:16.326781
5	2	Teacher	Test Teacher	2026-10-05	2026-10-05	Medical	Approved	2026-09-27 18:29:16.719383	t	323	2026-09-27 18:29:17.144444
6	2	Pilot	Ganesh Pillai	2026-10-07	2026-10-07	Vehicle service	Rejected	2026-09-27 18:29:17.115383	t	323	2026-09-27 18:29:17.160879
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.subjects (subject_id, name, modified_by, modified_at, school_id, is_active) FROM stdin;
1	Mathematics	322	2026-09-27 18:20:48.555968	1	t
2	English	322	2026-09-27 18:20:48.572951	1	t
3	Science	322	2026-09-27 18:20:48.58397	1	t
4	Social Studies	322	2026-09-27 18:20:48.594878	1	t
5	Computer Science	322	2026-09-27 18:20:48.606146	1	t
6	Art	322	2026-09-27 18:20:48.616202	1	t
7	Mathematics	323	2026-09-27 18:20:49.044412	2	t
8	English	323	2026-09-27 18:20:49.05581	2	t
9	Science	323	2026-09-27 18:20:49.068258	2	t
10	Social Studies	323	2026-09-27 18:20:49.079991	2	t
11	Computer Science	323	2026-09-27 18:20:49.092671	2	t
12	Art	323	2026-09-27 18:20:49.106045	2	t
\.


--
-- Data for Name: marks; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.marks (mark_id, student_id, subject_id, term, score, updated_at, updated_by_user, modified_by, modified_at, updated_by) FROM stdin;
1	1	6	Term 1	71	2026-09-27 18:29:14.013879	322	\N	2026-09-27 18:29:14.013879	\N
2	1	5	Term 1	78	2026-09-27 18:29:14.056859	322	\N	2026-09-27 18:29:14.056859	\N
3	1	2	Term 1	85	2026-09-27 18:29:14.075419	322	\N	2026-09-27 18:29:14.075419	\N
4	4	6	Term 1	74	2026-09-27 18:29:14.092737	322	\N	2026-09-27 18:29:14.092737	\N
5	4	5	Term 1	81	2026-09-27 18:29:14.109723	322	\N	2026-09-27 18:29:14.109723	\N
6	4	2	Term 1	88	2026-09-27 18:29:14.12669	322	\N	2026-09-27 18:29:14.12669	\N
7	2	6	Term 1	72	2026-09-27 18:29:14.14371	322	\N	2026-09-27 18:29:14.14371	\N
8	2	5	Term 1	79	2026-09-27 18:29:14.160999	322	\N	2026-09-27 18:29:14.160999	\N
9	2	2	Term 1	86	2026-09-27 18:29:14.177738	322	\N	2026-09-27 18:29:14.177738	\N
10	5	6	Term 1	75	2026-09-27 18:29:14.194385	322	\N	2026-09-27 18:29:14.194385	\N
11	5	5	Term 1	82	2026-09-27 18:29:14.211381	322	\N	2026-09-27 18:29:14.211381	\N
12	5	2	Term 1	89	2026-09-27 18:29:14.228147	322	\N	2026-09-27 18:29:14.228147	\N
13	3	6	Term 1	73	2026-09-27 18:29:14.244425	322	\N	2026-09-27 18:29:14.244425	\N
14	3	5	Term 1	80	2026-09-27 18:29:14.26266	322	\N	2026-09-27 18:29:14.26266	\N
15	3	2	Term 1	87	2026-09-27 18:29:14.278686	322	\N	2026-09-27 18:29:14.278686	\N
16	6	12	Term 1	76	2026-09-27 18:29:15.735088	323	\N	2026-09-27 18:29:15.735088	\N
17	6	11	Term 1	83	2026-09-27 18:29:15.75151	323	\N	2026-09-27 18:29:15.75151	\N
18	6	8	Term 1	90	2026-09-27 18:29:15.767776	323	\N	2026-09-27 18:29:15.767776	\N
19	9	12	Term 1	79	2026-09-27 18:29:15.784081	323	\N	2026-09-27 18:29:15.784081	\N
20	9	11	Term 1	86	2026-09-27 18:29:15.800018	323	\N	2026-09-27 18:29:15.800018	\N
21	9	8	Term 1	93	2026-09-27 18:29:15.816282	323	\N	2026-09-27 18:29:15.816282	\N
22	7	12	Term 1	77	2026-09-27 18:29:15.8323	323	\N	2026-09-27 18:29:15.8323	\N
23	7	11	Term 1	84	2026-09-27 18:29:15.848601	323	\N	2026-09-27 18:29:15.848601	\N
24	7	8	Term 1	91	2026-09-27 18:29:15.864544	323	\N	2026-09-27 18:29:15.864544	\N
25	10	12	Term 1	80	2026-09-27 18:29:15.880028	323	\N	2026-09-27 18:29:15.880028	\N
26	10	11	Term 1	87	2026-09-27 18:29:15.897053	323	\N	2026-09-27 18:29:15.897053	\N
27	10	8	Term 1	94	2026-09-27 18:29:15.912584	323	\N	2026-09-27 18:29:15.912584	\N
28	8	12	Term 1	78	2026-09-27 18:29:15.929079	323	\N	2026-09-27 18:29:15.929079	\N
29	8	11	Term 1	85	2026-09-27 18:29:15.945648	323	\N	2026-09-27 18:29:15.945648	\N
30	8	8	Term 1	92	2026-09-27 18:29:15.961886	323	\N	2026-09-27 18:29:15.961886	\N
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.media (media_id, school_id, class_id, title, posted_by, icon, created_at, is_active, file_url, media_kind, modified_by, modified_at) FROM stdin;
1	1	\N	Annual Sports Day	School Admin	\N	2026-09-27 18:31:51.910103	t	/api/v1/media/files/image_gallery_20260927_130151_900596.png	image	322	2026-09-27 18:31:51.910103
2	1	1	Class 1 Field Trip	School Admin	\N	2026-09-27 18:31:51.929356	t	/api/v1/media/files/image_gallery_20260927_130151_926936.png	image	322	2026-09-27 18:31:51.929356
3	2	\N	Annual Sports Day	School Admin	\N	2026-09-27 18:33:01.823629	t	/api/v1/media/files/image_gallery_20260927_130301_821838.png	image	323	2026-09-27 18:33:01.823629
4	2	4	Class 4 Field Trip	School Admin	\N	2026-09-27 18:33:01.837018	t	/api/v1/media/files/image_gallery_20260927_130301_834225.png	image	323	2026-09-27 18:33:01.837018
\.


--
-- Data for Name: parents; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.parents (parent_id, school_id, name, phone, email, created_at, is_active, address, emergency_number, modified_by, modified_at) FROM stdin;
1	1	Kavya Reddy	8105096987	ravigupta0307@gmail.com	2026-09-27 18:23:36.444495	t	\N	\N	322	2026-09-27 18:23:36.444495
2	1	Lokesh Murthy	8105096987	ravigupta0307@gmail.com	2026-09-27 18:23:36.462297	t	\N	\N	322	2026-09-27 18:23:36.462297
3	1	Nandini Rao	8105096987	ravigupta0307@gmail.com	2026-09-27 18:23:36.47811	t	\N	\N	322	2026-09-27 18:23:36.47811
4	1	Prakash Jain	8105096987	ravigupta0307@gmail.com	2026-09-27 18:23:36.491181	t	\N	\N	322	2026-09-27 18:23:36.491181
5	1	Sneha Bose	8105096987	ravigupta0307@gmail.com	2026-09-27 18:23:36.502449	t	\N	\N	322	2026-09-27 18:23:36.502449
6	2	Kavya Reddy	8105096987	ravigupta0307@gmail.com	2026-09-27 18:23:59.981999	t	\N	\N	323	2026-09-27 18:23:59.981999
7	2	Lokesh Murthy	8105096987	ravigupta0307@gmail.com	2026-09-27 18:23:59.994839	t	\N	\N	323	2026-09-27 18:23:59.994839
8	2	Nandini Rao	8105096987	ravigupta0307@gmail.com	2026-09-27 18:24:00.009128	t	\N	\N	323	2026-09-27 18:24:00.009128
9	2	Prakash Jain	8105096987	ravigupta0307@gmail.com	2026-09-27 18:24:00.020318	t	\N	\N	323	2026-09-27 18:24:00.020318
10	2	Sneha Bose	8105096987	ravigupta0307@gmail.com	2026-09-27 18:24:00.033407	t	\N	\N	323	2026-09-27 18:24:00.033407
\.


--
-- Data for Name: parent_student; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.parent_student (id, parent_id, student_id, relationship, modified_by, modified_at) FROM stdin;
1	1	1	Parent	322	2026-09-27 18:23:36.526259
2	2	2	Parent	322	2026-09-27 18:23:40.5435
3	3	3	Parent	322	2026-09-27 18:23:44.225706
4	4	4	Parent	322	2026-09-27 18:23:48.615234
5	5	5	Parent	322	2026-09-27 18:23:55.755233
6	6	6	Parent	323	2026-09-27 18:24:00.048773
7	7	7	Parent	323	2026-09-27 18:24:03.88131
8	8	8	Parent	323	2026-09-27 18:24:07.881882
9	9	9	Parent	323	2026-09-27 18:24:11.447427
10	10	10	Parent	323	2026-09-27 18:24:15.707248
\.


--
-- Data for Name: periods; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.periods (period_id, period_no, period_time, modified_by, modified_at) FROM stdin;
1	1	08:00 AM - 08:45 AM	\N	2026-09-27 18:20:21.851287
2	2	08:45 AM - 09:30 AM	\N	2026-09-27 18:20:21.851287
3	3	09:30 AM - 10:15 AM	\N	2026-09-27 18:20:21.851287
4	4	10:15 AM - 11:00 AM	\N	2026-09-27 18:20:21.851287
5	5	08:00 AM - 08:45 AM	322	2026-09-27 18:23:16.392111
6	6	08:00 AM - 08:45 AM	322	2026-09-27 18:23:16.415241
7	7	08:00 AM - 08:45 AM	322	2026-09-27 18:23:16.433168
8	8	08:00 AM - 08:45 AM	323	2026-09-27 18:23:16.956423
9	9	08:00 AM - 08:45 AM	323	2026-09-27 18:23:16.970876
10	10	08:00 AM - 08:45 AM	323	2026-09-27 18:23:16.987069
\.


--
-- Data for Name: pilots; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.pilots (pilot_id, is_active, staff_id, modified_by, modified_at, license_expiry, route_id) FROM stdin;
1	t	13	322	2026-09-27 18:29:31.162159	2030-06-30	1
2	t	14	322	2026-09-27 18:29:31.176013	2030-06-30	2
3	t	15	323	2026-09-27 18:29:31.915103	2030-06-30	3
4	t	16	323	2026-09-27 18:29:31.933713	2030-06-30	4
\.


--
-- Data for Name: route_stops; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.route_stops (stop_id, route_id, name, stop_time, stop_type, stop_order, modified_by, modified_at) FROM stdin;
1	1	Koramangala	07:45	pickup	1	322	2026-09-27 18:29:31.190303
2	1	Koramangala	08:30	drop	1	322	2026-09-27 18:29:31.190303
3	1	Indiranagar	08:00	pickup	2	322	2026-09-27 18:29:31.20178
4	1	Indiranagar	08:45	drop	2	322	2026-09-27 18:29:31.20178
5	2	Koramangala	07:45	pickup	1	322	2026-09-27 18:29:31.211408
6	2	Koramangala	08:30	drop	1	322	2026-09-27 18:29:31.211408
7	2	Indiranagar	08:00	pickup	2	322	2026-09-27 18:29:31.220724
8	2	Indiranagar	08:45	drop	2	322	2026-09-27 18:29:31.220724
9	3	Koramangala	07:45	pickup	1	323	2026-09-27 18:29:31.953868
10	3	Koramangala	08:30	drop	1	323	2026-09-27 18:29:31.953868
11	3	Indiranagar	08:00	pickup	2	323	2026-09-27 18:29:31.967648
12	3	Indiranagar	08:45	drop	2	323	2026-09-27 18:29:31.967648
13	4	Koramangala	07:45	pickup	1	323	2026-09-27 18:29:31.981582
14	4	Koramangala	08:30	drop	1	323	2026-09-27 18:29:31.981582
15	4	Indiranagar	08:00	pickup	2	323	2026-09-27 18:29:31.994723
16	4	Indiranagar	08:45	drop	2	323	2026-09-27 18:29:31.994723
\.


--
-- Data for Name: route_students; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.route_students (id, route_id, student_id, status, modified_by, modified_at) FROM stdin;
2	1	4	pending	322	2026-09-27 18:29:31.248434
3	1	2	pending	322	2026-09-27 18:29:31.260505
1	1	1	Picked	324	2026-09-27 18:29:31.562026
5	3	9	pending	323	2026-09-27 18:29:32.035739
6	3	7	pending	323	2026-09-27 18:29:32.053798
4	3	6	Picked	326	2026-09-27 18:29:32.43896
7	2	5	pending	322	2026-09-27 18:30:54.028027
8	2	3	pending	322	2026-09-27 18:30:54.046942
9	4	10	pending	323	2026-09-27 18:30:54.444979
10	4	8	pending	323	2026-09-27 18:30:54.463701
\.


--
-- Data for Name: school_notifications; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.school_notifications (notification_id, school_id, type, message, sent_at, status, modified_by, modified_at) FROM stdin;
1	1	Dues	Dues: please check the portal for details.	2026-09-27 18:32:21.664659	Sent	272	2026-09-27 18:32:21.664659
2	1	Activation	Activation: please check the portal for details.	2026-09-27 18:32:26.79476	Sent	272	2026-09-27 18:32:26.79476
3	1	General	General: please check the portal for details.	2026-09-27 18:32:30.844424	Read	322	2026-09-27 18:32:48.504867
4	2	Dues	Dues: please check the portal for details.	2026-09-27 18:32:48.798697	Sent	272	2026-09-27 18:32:48.798697
5	2	Activation	Activation: please check the portal for details.	2026-09-27 18:32:53.574328	Sent	272	2026-09-27 18:32:53.574328
6	2	General	General: please check the portal for details.	2026-09-27 18:32:57.796291	Read	323	2026-09-27 18:33:01.799391
\.


--
-- Data for Name: staff_attendance; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.staff_attendance (attendance_id, school_id, staff_id, date, status, check_in, check_out, remarks, marked_by, modified_by, modified_at) FROM stdin;
1	1	1	2026-09-25	Present	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:39.98929
2	1	2	2026-09-25	Present	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:39.98929
3	1	3	2026-09-25	Half day	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:39.98929
4	1	4	2026-09-25	Present	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:39.98929
5	1	5	2026-09-25	Absent	\N	\N	\N	322	\N	2026-09-27 18:28:39.98929
6	1	6	2026-09-25	On leave	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:39.98929
8	1	2	2026-09-26	Present	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:40.026484
9	1	3	2026-09-26	Half day	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:40.026484
10	1	4	2026-09-26	Present	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:40.026484
11	1	5	2026-09-26	Absent	\N	\N	\N	322	\N	2026-09-27 18:28:40.026484
12	1	6	2026-09-26	On leave	08:30:00	16:30:00	\N	322	\N	2026-09-27 18:28:40.026484
7	1	1	2026-09-26	Absent	\N	\N	\N	322	\N	2026-09-27 18:28:40.026484
14	2	7	2026-09-25	Present	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.493941
15	2	8	2026-09-25	Present	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.493941
16	2	9	2026-09-25	Half day	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.493941
17	2	10	2026-09-25	Present	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.493941
18	2	11	2026-09-25	Absent	\N	\N	\N	323	\N	2026-09-27 18:28:40.493941
19	2	12	2026-09-25	On leave	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.493941
21	2	8	2026-09-26	Present	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.524637
22	2	9	2026-09-26	Half day	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.524637
23	2	10	2026-09-26	Present	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.524637
24	2	11	2026-09-26	Absent	\N	\N	\N	323	\N	2026-09-27 18:28:40.524637
25	2	12	2026-09-26	On leave	08:30:00	16:30:00	\N	323	\N	2026-09-27 18:28:40.524637
20	2	7	2026-09-26	Absent	\N	\N	\N	323	\N	2026-09-27 18:28:40.524637
27	1	13	2026-09-26	Present	07:00:00	18:00:00	\N	322	\N	2026-09-27 18:28:51.006273
28	1	14	2026-09-26	Present	07:00:00	18:00:00	\N	322	\N	2026-09-27 18:28:51.006273
29	2	15	2026-09-26	Present	07:00:00	18:00:00	\N	323	\N	2026-09-27 18:28:51.423741
30	2	16	2026-09-26	Present	07:00:00	18:00:00	\N	323	\N	2026-09-27 18:28:51.423741
\.


--
-- Data for Name: teacher_class_subjects; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.teacher_class_subjects (id, staff_id, class_id, subject_id, is_class_teacher, modified_by, modified_at) FROM stdin;
1	1	1	6	t	322	2026-09-27 18:23:09.825579
2	2	2	5	t	322	2026-09-27 18:23:09.847619
3	3	3	2	t	322	2026-09-27 18:23:09.862635
4	1	1	1	t	322	2026-09-27 18:23:09.875476
5	2	2	3	t	322	2026-09-27 18:23:09.888831
6	3	3	4	t	322	2026-09-27 18:23:09.901808
7	7	4	12	t	323	2026-09-27 18:23:10.303222
8	8	5	11	t	323	2026-09-27 18:23:10.319009
9	9	6	8	t	323	2026-09-27 18:23:10.333653
10	7	4	7	t	323	2026-09-27 18:23:10.347318
11	8	5	9	t	323	2026-09-27 18:23:10.361094
12	9	6	10	t	323	2026-09-27 18:23:10.374429
\.


--
-- Data for Name: timetable_entries; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.timetable_entries (entry_id, class_id, day_of_week, period_id, subject_id, staff_id, is_holiday_override, school_id, period_start_time, period_end_time, created_on, created_by, modified_by, modified_at) FROM stdin;
1	1	Mon	5	6	1	f	1	08:00:00	08:45:00	2026-09-27 18:23:16.392111	322	322	2026-09-27 18:23:16.392111
2	2	Mon	6	5	2	f	1	08:00:00	08:45:00	2026-09-27 18:23:16.415241	322	322	2026-09-27 18:23:16.415241
3	3	Mon	7	2	3	f	1	08:00:00	08:45:00	2026-09-27 18:23:16.433168	322	322	2026-09-27 18:23:16.433168
4	4	Mon	8	12	7	f	2	08:00:00	08:45:00	2026-09-27 18:23:16.956423	323	323	2026-09-27 18:23:16.956423
5	5	Mon	9	11	8	f	2	08:00:00	08:45:00	2026-09-27 18:23:16.970876	323	323	2026-09-27 18:23:16.970876
6	6	Mon	10	8	9	f	2	08:00:00	08:45:00	2026-09-27 18:23:16.987069	323	323	2026-09-27 18:23:16.987069
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.vehicles (vehicle_id, school_id, vehicle_number, vehicle_type, registration_number, created_at, is_active, modified_by, modified_at) FROM stdin;
1	1	KA01AB1234	Bus	KA01AB1234	2026-09-27 18:29:31.140771	t	322	2026-09-27 18:29:31.140771
2	1	KA01CD5678	Van	KA01CD5678	2026-09-27 18:29:31.151916	t	322	2026-09-27 18:29:31.151916
3	2	KA01AB1234	Bus	KA01AB1234	2026-09-27 18:29:31.887547	t	323	2026-09-27 18:29:31.887547
4	2	KA01CD5678	Van	KA01CD5678	2026-09-27 18:29:31.901272	t	323	2026-09-27 18:29:31.901272
\.


--
-- Data for Name: website_pages; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.website_pages (page_id, school_id, slug, banner_url, heading, subheading, body, extra_json, is_active, modified_by, modified_at) FROM stdin;
1	1	home	\N	Welcome to our school	Admissions open for 2026	<p>Learning today, leading tomorrow.</p>	\N	t	322	2026-09-27 18:34:22.781153
2	1	about	\N	About Us	Since 1998	<p>We nurture curious minds.</p>	\N	t	322	2026-09-27 18:34:22.79243
3	1	contact	\N	Contact Us	We are happy to help	<p>Call 8105096987 or email us.</p>	\N	t	322	2026-09-27 18:34:22.803542
4	2	home	\N	Welcome to our school	Admissions open for 2026	<p>Learning today, leading tomorrow.</p>	\N	t	323	2026-09-27 18:34:23.570603
5	2	about	\N	About Us	Since 1998	<p>We nurture curious minds.</p>	\N	t	323	2026-09-27 18:34:23.58365
6	2	contact	\N	Contact Us	We are happy to help	<p>Call 8105096987 or email us.</p>	\N	t	323	2026-09-27 18:34:23.596875
\.


--
-- Data for Name: website_settings; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.website_settings (school_id, school_name, tagline, nav_links, font_family, font_size, accent_color, footer_address, footer_phone, footer_email, footer_copyright, is_active, icon_url, modified_by, modified_at) FROM stdin;
1	Green Valley Public School	Learning today, leading tomorrow	Home,About,Academics,Admissions,Contact	Inter, sans-serif	Large	#2563EB	Bengaluru, Karnataka	8105096987	ravigupta0307@gmail.com	(c) 2026 Green Valley Public School	t	\N	322	2026-09-27 18:34:22.815091
2	Blue Horizon Academy	Learning today, leading tomorrow	Home,About,Academics,Admissions,Contact	Inter, sans-serif	Large	#2563EB	Bengaluru, Karnataka	8105096987	ravigupta0307@gmail.com	(c) 2026 Blue Horizon Academy	t	\N	323	2026-09-27 18:34:23.61461
\.


--
-- Data for Name: website_testimonials; Type: TABLE DATA; Schema: schoolers; Owner: -
--

COPY schoolers.website_testimonials (testimonial_id, school_id, name, role, quote, created_at, is_active, modified_by, modified_at) FROM stdin;
1	1	Kavya Reddy	Parent	My child loves the science labs.	2026-09-27 18:33:56.653482	t	322	2026-09-27 18:33:56.653482
2	1	Ravi Gupta	Parent	The teachers are very supportive.	2026-09-27 18:33:56.673328	t	322	2026-09-27 18:33:56.673328
3	2	Kavya Reddy	Parent	My child loves the science labs.	2026-09-27 18:33:57.526462	t	323	2026-09-27 18:33:57.526462
4	2	Ravi Gupta	Parent	The teachers are very supportive.	2026-09-27 18:33:57.542687	t	323	2026-09-27 18:33:57.542687
\.


--
-- Name: activities_activity_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.activities_activity_id_seq', 6, true);


--
-- Name: attendance_attendance_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.attendance_attendance_id_seq', 20, true);


--
-- Name: barter_listings_listing_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.barter_listings_listing_id_seq', 6, true);


--
-- Name: broadcasts_broadcast_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.broadcasts_broadcast_id_seq', 8, true);


--
-- Name: classes_class_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.classes_class_id_seq', 6, true);


--
-- Name: holidays_holiday_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.holidays_holiday_id_seq', 15, true);


--
-- Name: leave_requests_leave_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.leave_requests_leave_id_seq', 6, true);


--
-- Name: marks_mark_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.marks_mark_id_seq', 30, true);


--
-- Name: media_media_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.media_media_id_seq', 4, true);


--
-- Name: parent_student_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.parent_student_id_seq', 10, true);


--
-- Name: parents_parent_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.parents_parent_id_seq', 10, true);


--
-- Name: periods_period_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.periods_period_id_seq', 10, true);


--
-- Name: pilots_pilot_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.pilots_pilot_id_seq', 4, true);


--
-- Name: route_stops_stop_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.route_stops_stop_id_seq', 16, true);


--
-- Name: route_students_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.route_students_id_seq', 10, true);


--
-- Name: routes_route_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.routes_route_id_seq', 4, true);


--
-- Name: school_notifications_notification_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.school_notifications_notification_id_seq', 6, true);


--
-- Name: schools_school_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.schools_school_id_seq', 2, true);


--
-- Name: staff_attendance_attendance_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.staff_attendance_attendance_id_seq', 30, true);


--
-- Name: staff_staff_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.staff_staff_id_seq', 16, true);


--
-- Name: students_student_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.students_student_id_seq', 10, true);


--
-- Name: subjects_subject_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.subjects_subject_id_seq', 12, true);


--
-- Name: teacher_class_subjects_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.teacher_class_subjects_id_seq', 12, true);


--
-- Name: timetable_entries_entry_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.timetable_entries_entry_id_seq', 6, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.users_user_id_seq', 341, true);


--
-- Name: vehicles_vehicle_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.vehicles_vehicle_id_seq', 4, true);


--
-- Name: website_pages_page_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.website_pages_page_id_seq', 6, true);


--
-- Name: website_testimonials_testimonial_id_seq; Type: SEQUENCE SET; Schema: schoolers; Owner: -
--

SELECT pg_catalog.setval('schoolers.website_testimonials_testimonial_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 84gTu3GXwCT4QTJrFE5UaZ3PyYcT8pwhLdhtAiibpk41tFjlZk7pe0JoMkgeQ7T


SET session_replication_role = DEFAULT;
