-- 映美数据库初始化脚本
CREATE DATABASE IF NOT EXISTS yingmei DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yingmei;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(64) NOT NULL DEFAULT '' COMMENT '昵称',
    avatar_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '头像URL',
    phone VARCHAR(20) NOT NULL DEFAULT '' COMMENT '手机号',
    password_hash VARCHAR(256) NOT NULL DEFAULT '' COMMENT '密码哈希',
    wechat_unionid VARCHAR(64) NOT NULL DEFAULT '' COMMENT '微信UnionID',
    vip_level TINYINT NOT NULL DEFAULT 0 COMMENT 'VIP等级 0=免费',
    vip_expire_time DATETIME NULL COMMENT 'VIP过期时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_phone (phone),
    UNIQUE KEY uk_wechat_unionid (wechat_unionid),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 素材分类表
CREATE TABLE IF NOT EXISTS material_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL COMMENT '分类名称',
    type ENUM('filter','sticker','font','template','background') NOT NULL COMMENT '素材类型',
    parent_id INT NOT NULL DEFAULT 0 COMMENT '父分类ID',
    weight INT NOT NULL DEFAULT 0 COMMENT '排序权重',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='素材分类表';

-- 素材表
CREATE TABLE IF NOT EXISTS materials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('filter','sticker','font','template','background') NOT NULL COMMENT '素材类型',
    name VARCHAR(128) NOT NULL COMMENT '素材名称',
    category_id INT NOT NULL DEFAULT 0 COMMENT '分类ID',
    tags JSON NULL COMMENT '标签',
    file_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '文件URL',
    thumbnail_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '缩略图URL',
    width INT NOT NULL DEFAULT 0 COMMENT '宽度',
    height INT NOT NULL DEFAULT 0 COMMENT '高度',
    weight INT NOT NULL DEFAULT 0 COMMENT '排序权重',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态 1=启用 0=禁用',
    creator_id BIGINT NOT NULL DEFAULT 0 COMMENT '上传者ID',
    audit_status TINYINT NOT NULL DEFAULT 1 COMMENT '审核状态 1=通过 0=待审',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_category (type, category_id),
    INDEX idx_weight (weight),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='素材表';

-- 作品表
CREATE TABLE IF NOT EXISTS artworks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    title VARCHAR(256) NOT NULL DEFAULT '' COMMENT '作品标题',
    original_image_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '原图URL',
    edit_config JSON NULL COMMENT '编辑配置JSON',
    thumbnail_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '缩略图URL',
    exported_image_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '导出图URL',
    is_public TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开',
    likes INT NOT NULL DEFAULT 0 COMMENT '点赞数',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_public (is_public),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作品表';

-- AI任务表
CREATE TABLE IF NOT EXISTS ai_tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 0 COMMENT '用户ID',
    type VARCHAR(32) NOT NULL COMMENT '任务类型',
    input_image_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '输入图URL',
    params JSON NULL COMMENT '请求参数',
    output_image_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '输出图URL',
    status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
    progress SMALLINT NOT NULL DEFAULT 0 COMMENT '进度百分比',
    error_msg VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '错误信息',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL COMMENT '完成时间',
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI任务表';

-- 用户收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_material (user_id, material_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏表';

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 0,
    action VARCHAR(64) NOT NULL COMMENT '操作类型',
    target_type VARCHAR(32) NOT NULL DEFAULT '' COMMENT '目标类型',
    target_id BIGINT NOT NULL DEFAULT 0 COMMENT '目标ID',
    detail JSON NULL COMMENT '操作详情',
    ip VARCHAR(45) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
