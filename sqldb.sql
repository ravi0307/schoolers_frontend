-- DROP SCHEMA schoolers;

CREATE SCHEMA schoolers AUTHORIZATION ravi;

-- DROP SEQUENCE schoolers.activities_activity_id_seq;

CREATE SEQUENCE schoolers.activities_activity_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.attendance_attendance_id_seq;

CREATE SEQUENCE schoolers.attendance_attendance_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.barter_listings_listing_id_seq;

CREATE SEQUENCE schoolers.barter_listings_listing_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.broadcasts_broadcast_id_seq;

CREATE SEQUENCE schoolers.broadcasts_broadcast_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.classes_class_id_seq;

CREATE SEQUENCE schoolers.classes_class_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.holidays_holiday_id_seq;

CREATE SEQUENCE schoolers.holidays_holiday_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.leave_requests_leave_id_seq;

CREATE SEQUENCE schoolers.leave_requests_leave_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.marks_mark_id_seq;

CREATE SEQUENCE schoolers.marks_mark_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.media_media_id_seq;

CREATE SEQUENCE schoolers.media_media_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.parent_student_id_seq;

CREATE SEQUENCE schoolers.parent_student_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.parents_parent_id_seq;

CREATE SEQUENCE schoolers.parents_parent_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.periods_period_id_seq;

CREATE SEQUENCE schoolers.periods_period_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.route_stops_stop_id_seq;

CREATE SEQUENCE schoolers.route_stops_stop_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.route_students_id_seq;

CREATE SEQUENCE schoolers.route_students_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.routes_route_id_seq;

CREATE SEQUENCE schoolers.routes_route_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.school_notifications_notification_id_seq;

CREATE SEQUENCE schoolers.school_notifications_notification_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.schools_school_id_seq;

CREATE SEQUENCE schoolers.schools_school_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.staff_staff_id_seq;

CREATE SEQUENCE schoolers.staff_staff_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.students_student_id_seq;

CREATE SEQUENCE schoolers.students_student_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.subjects_subject_id_seq;

CREATE SEQUENCE schoolers.subjects_subject_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.teacher_class_subjects_id_seq;

CREATE SEQUENCE schoolers.teacher_class_subjects_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.teachers_teacher_id_seq;

CREATE SEQUENCE schoolers.teachers_teacher_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.timetable_entries_entry_id_seq;

CREATE SEQUENCE schoolers.timetable_entries_entry_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.users_user_id_seq;

CREATE SEQUENCE schoolers.users_user_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.website_pages_page_id_seq;

CREATE SEQUENCE schoolers.website_pages_page_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE schoolers.website_testimonials_testimonial_id_seq;

CREATE SEQUENCE schoolers.website_testimonials_testimonial_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- schoolers.periods definition

-- Drop table

-- DROP TABLE schoolers.periods;

CREATE TABLE schoolers.periods (
	period_id serial4 NOT NULL,
	period_no int4 NOT NULL,
	period_time varchar(15) NOT NULL,
	CONSTRAINT periods_period_no_key UNIQUE (period_no),
	CONSTRAINT periods_pkey PRIMARY KEY (period_id)
);


-- schoolers.schools definition

-- Drop table

-- DROP TABLE schoolers.schools;

CREATE TABLE schoolers.schools (
	school_id serial4 NOT NULL,
	"name" varchar(150) NOT NULL,
	address varchar(200) NOT NULL,
	pincode varchar(12) NOT NULL,
	city varchar(80) NOT NULL,
	state varchar(80) NOT NULL,
	country varchar(80) DEFAULT 'India'::character varying NOT NULL,
	primary_contact varchar(30) NOT NULL,
	alternative_contact varchar(30) NULL,
	primary_email varchar(120) NOT NULL,
	alternative_email varchar(120) NULL,
	status varchar(10) DEFAULT 'Active'::character varying NOT NULL,
	route_enabled bool DEFAULT false NOT NULL,
	website_enabled bool DEFAULT false NOT NULL,
	library_enabled bool DEFAULT false NOT NULL,
	fees_enabled bool DEFAULT false NOT NULL,
	salary_enabled bool DEFAULT false NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT schools_pkey PRIMARY KEY (school_id),
	CONSTRAINT schools_status_check CHECK (((status)::text = ANY (ARRAY[('Active'::character varying)::text, ('Inactive'::character varying)::text])))
);


-- schoolers.subjects definition

-- Drop table

-- DROP TABLE schoolers.subjects;

CREATE TABLE schoolers.subjects (
	subject_id serial4 NOT NULL,
	"name" varchar(40) NOT NULL,
	CONSTRAINT subjects_name_key UNIQUE (name),
	CONSTRAINT subjects_pkey PRIMARY KEY (subject_id)
);


-- schoolers.activities definition

-- Drop table

-- DROP TABLE schoolers.activities;

CREATE TABLE schoolers.activities (
	activity_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	tag varchar(30) NOT NULL,
	title varchar(150) NOT NULL,
	description text NULL,
	published_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT activities_pkey PRIMARY KEY (activity_id),
	CONSTRAINT activities_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);


-- schoolers.barter_listings definition

-- Drop table

-- DROP TABLE schoolers.barter_listings;

CREATE TABLE schoolers.barter_listings (
	listing_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	title varchar(150) NOT NULL,
	price varchar(20) NOT NULL,
	icon varchar(10) NULL,
	listed_by varchar(100) NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT barter_listings_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);


-- schoolers.holidays definition

-- Drop table

-- DROP TABLE schoolers.holidays;

CREATE TABLE schoolers.holidays (
	holiday_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	day_of_week varchar(3) NOT NULL,
	is_holiday bool DEFAULT false NOT NULL,
	CONSTRAINT holidays_day_of_week_check CHECK (((day_of_week)::text = ANY (ARRAY[('Mon'::character varying)::text, ('Tue'::character varying)::text, ('Wed'::character varying)::text, ('Thu'::character varying)::text, ('Fri'::character varying)::text, ('Sat'::character varying)::text, ('Sun'::character varying)::text]))),
	CONSTRAINT holidays_pkey PRIMARY KEY (holiday_id),
	CONSTRAINT holidays_school_id_day_of_week_key UNIQUE (school_id, day_of_week),
	CONSTRAINT holidays_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);


-- schoolers.leave_requests definition

-- Drop table

-- DROP TABLE schoolers.leave_requests;

CREATE TABLE schoolers.leave_requests (
	leave_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	requester_type varchar(10) NOT NULL,
	requester_name varchar(100) NOT NULL,
	from_date date NOT NULL,
	to_date date NOT NULL,
	reason varchar(255) NULL,
	status varchar(10) DEFAULT 'Pending'::character varying NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT leave_requests_pkey PRIMARY KEY (leave_id),
	CONSTRAINT leave_requests_requester_type_check CHECK (((requester_type)::text = ANY (ARRAY[('Teacher'::character varying)::text, ('Student'::character varying)::text, ('Staff'::character varying)::text, ('Pilot'::character varying)::text]))),
	CONSTRAINT leave_requests_status_check CHECK (((status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Approved'::character varying)::text, ('Rejected'::character varying)::text]))),
	CONSTRAINT leave_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);
CREATE INDEX idx_leave_requests_school ON schoolers.leave_requests USING btree (school_id);


-- schoolers.parents definition

-- Drop table

-- DROP TABLE schoolers.parents;

CREATE TABLE schoolers.parents (
	parent_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	"name" varchar(100) NOT NULL,
	phone varchar(30) NOT NULL,
	email varchar(120) NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT parents_pkey PRIMARY KEY (parent_id),
	CONSTRAINT parents_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);
CREATE INDEX idx_parents_school ON schoolers.parents USING btree (school_id);


-- schoolers.routes definition

-- Drop table

-- DROP TABLE schoolers.routes;

CREATE TABLE schoolers.routes (
	route_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	"name" varchar(100) NOT NULL,
	vehicle varchar(60) NOT NULL,
	driver_name varchar(100) NOT NULL,
	status varchar(15) DEFAULT 'Scheduled'::character varying NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT routes_pkey PRIMARY KEY (route_id),
	CONSTRAINT routes_status_check CHECK (((status)::text = ANY (ARRAY[('On route'::character varying)::text, ('Scheduled'::character varying)::text, ('Inactive'::character varying)::text]))),
	CONSTRAINT routes_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);
CREATE INDEX idx_routes_school ON schoolers.routes USING btree (school_id);


-- schoolers.school_notifications definition

-- Drop table

-- DROP TABLE schoolers.school_notifications;

CREATE TABLE schoolers.school_notifications (
	notification_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	"type" varchar(20) NOT NULL,
	message text NOT NULL,
	sent_at timestamp DEFAULT now() NOT NULL,
	status varchar(10) DEFAULT 'Sent'::character varying NOT NULL,
	CONSTRAINT school_notifications_pkey PRIMARY KEY (notification_id),
	CONSTRAINT school_notifications_status_check CHECK (((status)::text = ANY (ARRAY[('Sent'::character varying)::text, ('Read'::character varying)::text]))),
	CONSTRAINT school_notifications_type_check CHECK (((type)::text = ANY (ARRAY[('Dues'::character varying)::text, ('Activation'::character varying)::text, ('General'::character varying)::text]))),
	CONSTRAINT school_notifications_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);


-- schoolers.staff definition

-- Drop table

-- DROP TABLE schoolers.staff;

CREATE TABLE schoolers.staff (
	staff_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(60) NOT NULL,
	phone varchar(30) NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT staff_pkey PRIMARY KEY (staff_id),
	CONSTRAINT staff_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);
CREATE INDEX idx_staff_school ON schoolers.staff USING btree (school_id);


-- schoolers.teachers definition

-- Drop table

-- DROP TABLE schoolers.teachers;

CREATE TABLE schoolers.teachers (
	teacher_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	"name" varchar(100) NOT NULL,
	role_title varchar(100) NOT NULL,
	phone varchar(30) NOT NULL,
	email varchar(120) NULL,
	attendance_status varchar(15) DEFAULT 'On time'::character varying NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT teachers_attendance_status_check CHECK (((attendance_status)::text = ANY (ARRAY[('On time'::character varying)::text, ('On leave'::character varying)::text, ('Absent'::character varying)::text]))),
	CONSTRAINT teachers_pkey PRIMARY KEY (teacher_id),
	CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);
CREATE INDEX idx_teachers_school ON schoolers.teachers USING btree (school_id);


-- schoolers.users definition

-- Drop table

-- DROP TABLE schoolers.users;

CREATE TABLE schoolers.users (
	user_id serial4 NOT NULL,
	school_id int4 NULL,
	"role" varchar(10) NOT NULL,
	username varchar(100) NOT NULL,
	password_hash varchar(255) NOT NULL,
	linked_person_id int4 NULL,
	last_login timestamp NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT users_pkey PRIMARY KEY (user_id),
	CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('parent'::character varying)::text, ('teacher'::character varying)::text, ('admin'::character varying)::text, ('pilot'::character varying)::text, ('master'::character varying)::text]))),
	CONSTRAINT users_username_key UNIQUE (username),
	CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);
CREATE INDEX idx_users_school ON schoolers.users USING btree (school_id);


-- schoolers.website_pages definition

-- Drop table

-- DROP TABLE schoolers.website_pages;

CREATE TABLE schoolers.website_pages (
	page_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	slug varchar(20) NOT NULL,
	banner_url varchar(255) NULL,
	heading varchar(200) NOT NULL,
	subheading varchar(255) NULL,
	body text NULL,
	extra_json jsonb NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT website_pages_pkey PRIMARY KEY (page_id),
	CONSTRAINT website_pages_school_id_slug_key UNIQUE (school_id, slug),
	CONSTRAINT website_pages_slug_check CHECK (((slug)::text = ANY (ARRAY[('home'::character varying)::text, ('about'::character varying)::text, ('academics'::character varying)::text, ('admissions'::character varying)::text, ('contact'::character varying)::text]))),
	CONSTRAINT website_pages_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);


-- schoolers.website_settings definition

-- Drop table

-- DROP TABLE schoolers.website_settings;

CREATE TABLE schoolers.website_settings (
	school_id int4 NOT NULL,
	school_name varchar(150) NOT NULL,
	tagline varchar(200) NULL,
	nav_links varchar(255) DEFAULT 'Home,About,Academics,Admissions,Contact'::character varying NOT NULL,
	font_family varchar(60) DEFAULT 'Inter, sans-serif'::character varying NOT NULL,
	font_size varchar(10) DEFAULT 'Medium'::character varying NOT NULL,
	accent_color varchar(10) DEFAULT '#023859'::character varying NOT NULL,
	footer_address varchar(200) NULL,
	footer_phone varchar(30) NULL,
	footer_email varchar(120) NULL,
	footer_copyright varchar(150) NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT website_settings_font_size_check CHECK (((font_size)::text = ANY (ARRAY[('Small'::character varying)::text, ('Medium'::character varying)::text, ('Large'::character varying)::text]))),
	CONSTRAINT website_settings_pkey PRIMARY KEY (school_id),
	CONSTRAINT website_settings_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);


-- schoolers.website_testimonials definition

-- Drop table

-- DROP TABLE schoolers.website_testimonials;

CREATE TABLE schoolers.website_testimonials (
	testimonial_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(100) NOT NULL,
	"quote" text NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT website_testimonials_pkey PRIMARY KEY (testimonial_id),
	CONSTRAINT website_testimonials_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);


-- schoolers.classes definition

-- Drop table

-- DROP TABLE schoolers.classes;

CREATE TABLE schoolers.classes (
	class_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	"name" varchar(40) NOT NULL,
	class_teacher_id int4 NULL,
	student_count int4 DEFAULT 0 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT classes_pkey PRIMARY KEY (class_id),
	CONSTRAINT classes_school_id_name_key UNIQUE (school_id, name),
	CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE,
	CONSTRAINT fk_classes_teacher FOREIGN KEY (class_teacher_id) REFERENCES schoolers.teachers(teacher_id) ON DELETE SET NULL
);
CREATE INDEX idx_classes_school ON schoolers.classes USING btree (school_id);


-- schoolers.media definition

-- Drop table

-- DROP TABLE schoolers.media;

CREATE TABLE schoolers.media (
	media_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	class_id int4 NULL,
	title varchar(150) NOT NULL,
	posted_by varchar(100) NOT NULL,
	icon varchar(10) NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT media_pkey PRIMARY KEY (media_id),
	CONSTRAINT media_class_id_fkey FOREIGN KEY (class_id) REFERENCES schoolers.classes(class_id) ON DELETE SET NULL,
	CONSTRAINT media_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);


-- schoolers.route_stops definition

-- Drop table

-- DROP TABLE schoolers.route_stops;

CREATE TABLE schoolers.route_stops (
	stop_id serial4 NOT NULL,
	route_id int4 NOT NULL,
	"name" varchar(120) NOT NULL,
	stop_time varchar(15) NOT NULL,
	stop_type varchar(10) NOT NULL,
	stop_order int4 DEFAULT 1 NOT NULL,
	CONSTRAINT route_stops_pkey PRIMARY KEY (stop_id),
	CONSTRAINT route_stops_stop_type_check CHECK (((stop_type)::text = ANY (ARRAY[('pickup'::character varying)::text, ('drop'::character varying)::text]))),
	CONSTRAINT route_stops_route_id_fkey FOREIGN KEY (route_id) REFERENCES schoolers.routes(route_id) ON DELETE CASCADE
);
CREATE INDEX idx_route_stops_route ON schoolers.route_stops USING btree (route_id);


-- schoolers.students definition

-- Drop table

-- DROP TABLE schoolers.students;

CREATE TABLE schoolers.students (
	student_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	class_id int4 NOT NULL,
	admission_no varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	date_of_birth date NULL,
	gender varchar(10) NULL,
	present_today bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT students_admission_no_key UNIQUE (admission_no),
	CONSTRAINT students_gender_check CHECK (((gender)::text = ANY (ARRAY[('Male'::character varying)::text, ('Female'::character varying)::text, ('Other'::character varying)::text]))),
	CONSTRAINT students_pkey PRIMARY KEY (student_id),
	CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES schoolers.classes(class_id) ON DELETE RESTRICT,
	CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);
CREATE INDEX idx_students_class ON schoolers.students USING btree (class_id);
CREATE INDEX idx_students_school ON schoolers.students USING btree (school_id);


-- schoolers.teacher_class_subjects definition

-- Drop table

-- DROP TABLE schoolers.teacher_class_subjects;

CREATE TABLE schoolers.teacher_class_subjects (
	id serial4 NOT NULL,
	teacher_id int4 NOT NULL,
	class_id int4 NOT NULL,
	subject_id int4 NOT NULL,
	is_class_teacher bool DEFAULT false NOT NULL,
	CONSTRAINT teacher_class_subjects_pkey PRIMARY KEY (id),
	CONSTRAINT teacher_class_subjects_teacher_id_class_id_subject_id_key UNIQUE (teacher_id, class_id, subject_id),
	CONSTRAINT teacher_class_subjects_class_id_fkey FOREIGN KEY (class_id) REFERENCES schoolers.classes(class_id) ON DELETE CASCADE,
	CONSTRAINT teacher_class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES schoolers.subjects(subject_id) ON DELETE CASCADE,
	CONSTRAINT teacher_class_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES schoolers.teachers(teacher_id) ON DELETE CASCADE
);


-- schoolers.timetable_entries definition

-- Drop table

-- DROP TABLE schoolers.timetable_entries;

CREATE TABLE schoolers.timetable_entries (
	entry_id serial4 NOT NULL,
	class_id int4 NOT NULL,
	day_of_week varchar(3) NOT NULL,
	period_id int4 NOT NULL,
	subject_id int4 NULL,
	teacher_id int4 NULL,
	is_holiday_override bool DEFAULT false NOT NULL,
	CONSTRAINT timetable_entries_class_id_day_of_week_period_id_key UNIQUE (class_id, day_of_week, period_id),
	CONSTRAINT timetable_entries_day_of_week_check CHECK (((day_of_week)::text = ANY (ARRAY[('Mon'::character varying)::text, ('Tue'::character varying)::text, ('Wed'::character varying)::text, ('Thu'::character varying)::text, ('Fri'::character varying)::text, ('Sat'::character varying)::text, ('Sun'::character varying)::text]))),
	CONSTRAINT timetable_entries_pkey PRIMARY KEY (entry_id),
	CONSTRAINT timetable_entries_class_id_fkey FOREIGN KEY (class_id) REFERENCES schoolers.classes(class_id) ON DELETE CASCADE,
	CONSTRAINT timetable_entries_period_id_fkey FOREIGN KEY (period_id) REFERENCES schoolers.periods(period_id) ON DELETE CASCADE,
	CONSTRAINT timetable_entries_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES schoolers.subjects(subject_id) ON DELETE SET NULL,
	CONSTRAINT timetable_entries_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES schoolers.teachers(teacher_id) ON DELETE SET NULL
);
CREATE INDEX idx_timetable_class ON schoolers.timetable_entries USING btree (class_id);


-- schoolers.attendance definition

-- Drop table

-- DROP TABLE schoolers.attendance;

CREATE TABLE schoolers.attendance (
	attendance_id serial4 NOT NULL,
	student_id int4 NOT NULL,
	class_id int4 NOT NULL,
	"date" date NOT NULL,
	status varchar(10) NOT NULL,
	marked_by int4 NULL,
	CONSTRAINT attendance_status_check CHECK (((status)::text = ANY (ARRAY[('Present'::character varying)::text, ('Absent'::character varying)::text]))),
	CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES schoolers.classes(class_id) ON DELETE CASCADE,
	CONSTRAINT attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES schoolers.teachers(teacher_id),
	CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES schoolers.students(student_id) ON DELETE CASCADE
);
CREATE INDEX idx_attendance_student_date ON schoolers.attendance USING btree (student_id, date);


-- schoolers.broadcasts definition

-- Drop table

-- DROP TABLE schoolers.broadcasts;

CREATE TABLE schoolers.broadcasts (
	broadcast_id serial4 NOT NULL,
	school_id int4 NOT NULL,
	class_id int4 NULL,
	"scope" varchar(10) NOT NULL,
	from_name varchar(100) NOT NULL,
	message text NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT broadcasts_pkey PRIMARY KEY (broadcast_id),
	CONSTRAINT broadcasts_scope_check CHECK (((scope)::text = ANY (ARRAY[('school'::character varying)::text, ('class'::character varying)::text, ('pilot'::character varying)::text]))),
	CONSTRAINT broadcasts_class_id_fkey FOREIGN KEY (class_id) REFERENCES schoolers.classes(class_id) ON DELETE CASCADE,
	CONSTRAINT broadcasts_school_id_fkey FOREIGN KEY (school_id) REFERENCES schoolers.schools(school_id) ON DELETE CASCADE
);
CREATE INDEX idx_broadcasts_school ON schoolers.broadcasts USING btree (school_id);


-- schoolers.marks definition

-- Drop table

-- DROP TABLE schoolers.marks;

CREATE TABLE schoolers.marks (
	mark_id serial4 NOT NULL,
	student_id int4 NOT NULL,
	subject_id int4 NOT NULL,
	term varchar(20) DEFAULT 'Term 1'::character varying NOT NULL,
	score int4 NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT marks_pkey PRIMARY KEY (mark_id),
	CONSTRAINT marks_score_check CHECK (((score >= 0) AND (score <= 100))),
	CONSTRAINT marks_student_id_subject_id_term_key UNIQUE (student_id, subject_id, term),
	CONSTRAINT marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES schoolers.students(student_id) ON DELETE CASCADE,
	CONSTRAINT marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES schoolers.subjects(subject_id) ON DELETE CASCADE,
	CONSTRAINT marks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES schoolers.teachers(teacher_id)
);
CREATE INDEX idx_marks_student ON schoolers.marks USING btree (student_id);


-- schoolers.parent_student definition

-- Drop table

-- DROP TABLE schoolers.parent_student;

CREATE TABLE schoolers.parent_student (
	id serial4 NOT NULL,
	parent_id int4 NOT NULL,
	student_id int4 NOT NULL,
	relationship varchar(20) DEFAULT 'Parent'::character varying NOT NULL,
	CONSTRAINT parent_student_parent_id_student_id_key UNIQUE (parent_id, student_id),
	CONSTRAINT parent_student_pkey PRIMARY KEY (id),
	CONSTRAINT parent_student_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES schoolers.parents(parent_id) ON DELETE CASCADE,
	CONSTRAINT parent_student_student_id_fkey FOREIGN KEY (student_id) REFERENCES schoolers.students(student_id) ON DELETE CASCADE
);


-- schoolers.route_students definition

-- Drop table

-- DROP TABLE schoolers.route_students;

CREATE TABLE schoolers.route_students (
	id serial4 NOT NULL,
	route_id int4 NOT NULL,
	student_id int4 NOT NULL,
	CONSTRAINT route_students_pkey PRIMARY KEY (id),
	CONSTRAINT route_students_route_id_student_id_key UNIQUE (route_id, student_id),
	CONSTRAINT route_students_route_id_fkey FOREIGN KEY (route_id) REFERENCES schoolers.routes(route_id) ON DELETE CASCADE,
	CONSTRAINT route_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES schoolers.students(student_id) ON DELETE CASCADE
);
