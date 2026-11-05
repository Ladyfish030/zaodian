# 材料模块

fabricCatalog 声明五种本地程序测试布料及字段校验。textureCache 按 URL、色彩空间和包装模式引用计数，共享只读纹理，零引用释放。materialLoader 创建独立材质与可取消租约。applyFabric 按部件或显式 groupKey 原子提交、处理乱序和失败回滚、恢复默认。

源材质保留到模型卸载；仅销毁材料模块自己创建的材质和纹理。物理尺寸是测试假设，不代表占位模型 UV 的真实比例。
